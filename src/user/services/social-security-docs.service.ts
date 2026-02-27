import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { createHash } from "crypto";
import { IsNull, Repository } from "typeorm";
import {
  CompleteSocialSecurityUploadDto,
  MAX_SOCIAL_SECURITY_DOC_SIZE_BYTES,
  RequestSocialSecurityUploadUrlDto,
} from "../dto/social-security-docs.dto";
import { SocialSecurityDocIdempotency } from "../entities/social-security-doc-idempotency.entity";
import {
  SocialSecurityDocument,
  SocialSecurityDocumentStatus,
  SocialSecurityDocumentType,
} from "../entities/social-security-document.entity";

type IdempotentParams<TPayload, TResult> = {
  userId: number;
  scope: string;
  idempotencyKey: string;
  payload: TPayload;
  handler: () => Promise<TResult>;
};

type StorageObjectInfo = {
  size_bytes: number | null;
  mime_type: string | null;
};

@Injectable()
export class SocialSecurityDocsService {
  private readonly bucket = process.env.SOCIAL_SECURITY_BUCKET || "suarec-media";
  private readonly basePath = process.env.SOCIAL_SECURITY_BASE_PATH || "user_segurosoc";
  private readonly downloadUrlTtlSeconds = Number(
    process.env.SOCIAL_SECURITY_DOWNLOAD_URL_TTL_SECONDS || 120,
  );

  constructor(
    @InjectRepository(SocialSecurityDocument)
    private readonly docsRepository: Repository<SocialSecurityDocument>, // eslint-disable-line no-unused-vars
    @InjectRepository(SocialSecurityDocIdempotency)
    private readonly idempotencyRepository: Repository<SocialSecurityDocIdempotency>, // eslint-disable-line no-unused-vars
  ) {}

  async requestUploadUrl(
    userId: number,
    dto: RequestSocialSecurityUploadUrlDto,
    idempotencyKey: string,
  ) {
    this.validateIdempotencyKey(idempotencyKey);
    this.validatePdfPayload(dto.content_type, dto.size_bytes, dto.filename);

    return this.executeIdempotent({
      userId,
      scope: "upload-url",
      idempotencyKey,
      payload: dto,
      handler: async () => {
        const version = await this.getNextVersion(userId, dto.document_type);
        const storagePath = this.buildStoragePath(userId, dto.document_type, version);
        const signedUploadUrl = await this.createSignedUploadUrl(storagePath);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        const doc = this.docsRepository.create({
          user_id: userId,
          document_type: dto.document_type,
          status: SocialSecurityDocumentStatus.PENDING_UPLOAD,
          version,
          is_current: false,
          bucket: this.bucket,
          storage_path: storagePath,
          original_filename: dto.filename,
          mime_type: dto.content_type.toLowerCase(),
          size_bytes: dto.size_bytes,
          sha256: dto.sha256 || null,
        });

        const savedDoc = await this.docsRepository.save(doc);
        const responsePayload = {
          id: savedDoc.id,
          document_type: savedDoc.document_type,
          status: savedDoc.status,
          upload: {
            bucket: savedDoc.bucket,
            path: savedDoc.storage_path,
            signed_upload_url: signedUploadUrl,
            expires_at: expiresAt.toISOString(),
          },
          signed_upload_url: signedUploadUrl,
          expires_at: expiresAt.toISOString(),
          created_at: savedDoc.created_at,
        };

        return responsePayload;
      },
    });
  }

  async completeUpload(
    userId: number,
    id: string,
    dto: CompleteSocialSecurityUploadDto,
    idempotencyKey: string,
  ) {
    this.validateIdempotencyKey(idempotencyKey);
    this.validatePdfPayload(dto.content_type, dto.size_bytes, dto.original_filename);

    return this.executeIdempotent({
      userId,
      scope: `complete:${id}`,
      idempotencyKey,
      payload: dto,
      handler: async () => {
        const doc = await this.getOwnedDocument(userId, id);

        if (doc.status === SocialSecurityDocumentStatus.DELETED || doc.deleted_at) {
          throw new NotFoundException("Documento no encontrado");
        }

        if (
          doc.status !== SocialSecurityDocumentStatus.PENDING_UPLOAD &&
          doc.status !== SocialSecurityDocumentStatus.PENDING
        ) {
          throw new BadRequestException("El documento no está disponible para completar carga");
        }

        const objectInfo = await this.getStorageObjectInfo(doc.storage_path);
        if (!objectInfo) {
          throw new BadRequestException("El archivo no existe en storage");
        }

        const objectMimeType = objectInfo.mime_type?.toLowerCase();
        if (objectMimeType && objectMimeType !== "application/pdf") {
          throw new UnsupportedMediaTypeException("Solo se permiten archivos PDF");
        }

        if (
          typeof objectInfo.size_bytes === "number" &&
          objectInfo.size_bytes > MAX_SOCIAL_SECURITY_DOC_SIZE_BYTES
        ) {
          throw new PayloadTooLargeException("El archivo supera el tamaño máximo de 10MB");
        }

        if (
          typeof objectInfo.size_bytes === "number" &&
          dto.size_bytes > 0 &&
          objectInfo.size_bytes !== dto.size_bytes
        ) {
          throw new BadRequestException("El tamaño del archivo no coincide con el declarado");
        }

        await this.docsRepository
          .createQueryBuilder()
          .update(SocialSecurityDocument)
          .set({ is_current: false })
          .where("user_id = :userId", { userId })
          .andWhere("document_type = :documentType", {
            documentType: doc.document_type,
          })
          .andWhere("id <> :id", { id: doc.id })
          .andWhere("is_current = true")
          .andWhere("deleted_at IS NULL")
          .execute();

        doc.status = SocialSecurityDocumentStatus.PENDING;
        doc.is_current = true;
        doc.original_filename = dto.original_filename;
        doc.mime_type = dto.content_type.toLowerCase();
        doc.size_bytes = dto.size_bytes;
        doc.sha256 = dto.sha256 || doc.sha256 || null;

        const savedDoc = await this.docsRepository.save(doc);
        return this.toPublicDocument(savedDoc);
      },
    });
  }

  async listMyDocuments(userId: number) {
    const docs = await this.docsRepository.find({
      where: {
        user_id: userId,
        deleted_at: IsNull(),
      },
      order: {
        document_type: "ASC",
        version: "DESC",
        created_at: "DESC",
      },
    });

    return docs.map((doc) => this.toPublicDocument(doc));
  }

  async getDownloadUrl(userId: number, id: string) {
    const doc = await this.getOwnedDocument(userId, id);

    if (doc.deleted_at || doc.status === SocialSecurityDocumentStatus.DELETED) {
      throw new NotFoundException("Documento no encontrado");
    }

    if (doc.status === SocialSecurityDocumentStatus.PENDING_UPLOAD) {
      throw new BadRequestException("El documento todavía no está disponible para descarga");
    }

    const signedUrl = await this.createSignedDownloadUrl(
      doc.storage_path,
      this.downloadUrlTtlSeconds,
    );
    const expiresAt = new Date(Date.now() + this.downloadUrlTtlSeconds * 1000);

    return {
      signed_url: signedUrl,
      expires_at: expiresAt.toISOString(),
    };
  }

  async deleteMyDocument(userId: number, id: string) {
    const doc = await this.getOwnedDocument(userId, id);
    const now = new Date();

    doc.status = SocialSecurityDocumentStatus.DELETED;
    doc.is_current = false;
    doc.deleted_at = now;
    doc.deleted_by = userId;
    doc.storage_delete_scheduled_at = now;

    await this.docsRepository.save(doc);

    const hardDeleted = await this.tryRemoveFromStorage(doc.storage_path);
    if (hardDeleted) {
      doc.storage_deleted_at = new Date();
      await this.docsRepository.save(doc);
    }

    return { message: "Documento eliminado exitosamente" };
  }

  private async getOwnedDocument(userId: number, id: string) {
    const doc = await this.docsRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!doc) {
      throw new NotFoundException("Documento no encontrado");
    }

    return doc;
  }

  private async getNextVersion(
    userId: number,
    documentType: SocialSecurityDocumentType,
  ): Promise<number> {
    const latestDoc = await this.docsRepository.findOne({
      where: {
        user_id: userId,
        document_type: documentType,
      },
      order: {
        version: "DESC",
      },
    });

    return (latestDoc?.version || 0) + 1;
  }

  private validateIdempotencyKey(idempotencyKey?: string) {
    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new BadRequestException("El header Idempotency-Key es obligatorio");
    }

    if (idempotencyKey.length > 255) {
      throw new BadRequestException("Idempotency-Key no puede superar 255 caracteres");
    }
  }

  private validatePdfPayload(
    contentType?: string,
    sizeBytes?: number,
    fileName?: string,
  ) {
    if (!contentType || contentType.toLowerCase() !== "application/pdf") {
      throw new UnsupportedMediaTypeException("Solo se permite content_type application/pdf");
    }

    if (!sizeBytes || sizeBytes <= 0) {
      throw new BadRequestException("size_bytes debe ser mayor a cero");
    }

    if (sizeBytes > MAX_SOCIAL_SECURITY_DOC_SIZE_BYTES) {
      throw new PayloadTooLargeException("El archivo supera el tamaño máximo de 10MB");
    }

    if (fileName && !fileName.toLowerCase().endsWith(".pdf")) {
      throw new BadRequestException("El archivo debe tener extensión .pdf");
    }
  }

  private buildStoragePath(
    userId: number,
    documentType: SocialSecurityDocumentType,
    version: number,
  ): string {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
    return `${this.basePath}/${userId}/${documentType}_${timestamp}_v${version}.pdf`;
  }

  private async executeIdempotent<TPayload, TResult>(
    params: IdempotentParams<TPayload, TResult>,
  ): Promise<TResult> {
    const requestHash = this.hashPayload(params.payload);
    const existing = await this.idempotencyRepository.findOne({
      where: {
        user_id: params.userId,
        scope: params.scope,
        idempotency_key: params.idempotencyKey,
      },
    });

    if (existing) {
      if (existing.request_hash !== requestHash) {
        throw new ConflictException(
          "Idempotency-Key reutilizado con payload distinto",
        );
      }
      return existing.response_payload as TResult;
    }

    const result = await params.handler();
    const record = this.idempotencyRepository.create({
      user_id: params.userId,
      scope: params.scope,
      idempotency_key: params.idempotencyKey,
      request_hash: requestHash,
      response_payload: result as any,
    });

    try {
      await this.idempotencyRepository.save(record);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const racedRecord = await this.idempotencyRepository.findOne({
          where: {
            user_id: params.userId,
            scope: params.scope,
            idempotency_key: params.idempotencyKey,
          },
        });

        if (!racedRecord) {
          throw error;
        }

        if (racedRecord.request_hash !== requestHash) {
          throw new ConflictException(
            "Idempotency-Key reutilizado con payload distinto",
          );
        }

        return racedRecord.response_payload as TResult;
      }

      throw error;
    }

    return result;
  }

  private hashPayload(payload: any): string {
    const normalized = this.normalizePayload(payload);
    return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  }

  private normalizePayload(value: any): any {
    if (Array.isArray(value)) {
      return value.map((entry) => this.normalizePayload(entry));
    }

    if (value && typeof value === "object") {
      const sortedKeys = Object.keys(value).sort();
      const normalizedObject = {};

      for (const key of sortedKeys) {
        const currentValue = value[key];
        if (typeof currentValue === "undefined") {
          continue;
        }
        normalizedObject[key] = this.normalizePayload(currentValue);
      }

      return normalizedObject;
    }

    return value;
  }

  private isUniqueViolation(error: any): boolean {
    return (
      error?.code === "23505" ||
      String(error?.message || "").toLowerCase().includes("duplicate key")
    );
  }

  private getStorageApiBaseUrl(): string {
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!supabaseUrl) {
      throw new InternalServerErrorException(
        "SUPABASE_URL no está configurado",
      );
    }

    return `${supabaseUrl.replace(/\/$/, "")}/storage/v1`;
  }

  private getStorageHeaders() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new InternalServerErrorException(
        "SUPABASE_SERVICE_ROLE_KEY no está configurado",
      );
    }

    return {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    };
  }

  private encodeStoragePath(path: string): string {
    return path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }

  private absoluteStorageUrl(urlOrPath: string): string {
    if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
      return urlOrPath;
    }

    const storageBase = this.getStorageApiBaseUrl();
    if (urlOrPath.startsWith("/")) {
      return `${storageBase}${urlOrPath}`;
    }

    return `${storageBase}/${urlOrPath}`;
  }

  private async createSignedUploadUrl(storagePath: string): Promise<string> {
    const encodedPath = this.encodeStoragePath(storagePath);
    const url = `${this.getStorageApiBaseUrl()}/object/upload/sign/${this.bucket}/${encodedPath}`;
    const response = await axios.post(url, {}, { headers: this.getStorageHeaders() });
    const signedUrlPath =
      response.data?.url || response.data?.signedURL || response.data?.signedUrl;

    if (!signedUrlPath || typeof signedUrlPath !== "string") {
      throw new InternalServerErrorException(
        "No se pudo generar la signed upload URL",
      );
    }

    return this.absoluteStorageUrl(signedUrlPath);
  }

  private async createSignedDownloadUrl(
    storagePath: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const encodedPath = this.encodeStoragePath(storagePath);
    const url = `${this.getStorageApiBaseUrl()}/object/sign/${this.bucket}/${encodedPath}`;
    const response = await axios.post(
      url,
      { expiresIn: expiresInSeconds },
      { headers: this.getStorageHeaders() },
    );

    const signedUrlPath =
      response.data?.signedURL || response.data?.signedUrl || response.data?.url;

    if (!signedUrlPath || typeof signedUrlPath !== "string") {
      throw new InternalServerErrorException(
        "No se pudo generar la signed download URL",
      );
    }

    return this.absoluteStorageUrl(signedUrlPath);
  }

  private async getStorageObjectInfo(
    storagePath: string,
  ): Promise<StorageObjectInfo | null> {
    const encodedPath = this.encodeStoragePath(storagePath);
    const url = `${this.getStorageApiBaseUrl()}/object/info/${this.bucket}/${encodedPath}`;

    try {
      const response = await axios.get(url, { headers: this.getStorageHeaders() });
      const metadata = response.data?.metadata || {};
      const parsedSize = Number(metadata.size ?? response.data?.size);

      const sizeBytes = Number.isFinite(parsedSize) ? parsedSize : null;
      const mimeType =
        String(metadata.mimetype || response.data?.mimetype || "").trim().toLowerCase() ||
        null;

      return {
        size_bytes: sizeBytes,
        mime_type: mimeType,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        if (status === 400 || status === 404) {
          return null;
        }
      }

      throw new InternalServerErrorException(
        "No se pudo validar la existencia del archivo en storage",
      );
    }
  }

  private async tryRemoveFromStorage(storagePath: string): Promise<boolean> {
    const url = `${this.getStorageApiBaseUrl()}/object/${this.bucket}`;

    try {
      await axios.delete(url, {
        headers: this.getStorageHeaders(),
        data: { prefixes: [storagePath] },
      });
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return true;
      }

      return false;
    }
  }

  private toPublicDocument(doc: SocialSecurityDocument) {
    return {
      id: doc.id,
      document_type: doc.document_type,
      type: doc.document_type,
      status: doc.status,
      version: doc.version,
      is_current: doc.is_current,
      original_filename: doc.original_filename,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  }
}

