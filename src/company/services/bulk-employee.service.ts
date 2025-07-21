import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { User } from '../../user/entities/user.entity';
import { Company } from '../entities/company.entity';
import { CompanyHistory } from '../entities/company-history.entity';
import { Role } from '../../role/entities/role.entity';
import { BulkEmployeeDataDto, BulkEmployeeUploadResponseDto } from '../dto/bulk-employee-upload.dto';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { UserService } from '../../user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BulkEmployeeService {
  private readonly logger = new Logger(BulkEmployeeService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CompanyHistory)
    private readonly companyHistoryRepository: Repository<CompanyHistory>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
  ) {}

  async processExcelFile(
    fileBuffer: Buffer,
    companyId: string,
  ): Promise<BulkEmployeeUploadResponseDto> {
    // Usar transacción para asegurar atomicidad
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar que la empresa existe
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });

      if (!company) {
        throw new BadRequestException(`Company with ID ${companyId} not found`);
      }

      // Leer el archivo Excel
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new BadRequestException('No se encontró ninguna hoja en el archivo Excel');
      }

      // Convertir a JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        throw new BadRequestException('El archivo debe tener al menos una fila de datos (excluyendo el encabezado)');
      }

      // Obtener encabezados (primera fila)
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      // Filtrar filas vacías - solo procesar filas que tengan al menos un valor
      const nonEmptyRows = dataRows.filter(row => {
        if (!Array.isArray(row)) return false;
        return row.some(cell => cell !== null && cell !== undefined && cell !== '');
      });

      this.logger.log(`Total rows in file: ${dataRows.length}, Non-empty rows: ${nonEmptyRows.length}`);

      if (nonEmptyRows.length === 0) {
        throw new BadRequestException('No se encontraron filas con datos válidos en el archivo');
      }

      // Validar encabezados requeridos
      const requiredHeaders = ['email'];
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

      if (missingHeaders.length > 0) {
        throw new BadRequestException(
          `Falta el encabezado requerido: ${missingHeaders.join(', ')}`
        );
      }

      // Obtener el rol PERSON
      const personRole = await this.roleRepository.findOne({
        where: { name: 'PERSON' },
      });

      if (!personRole) {
        throw new BadRequestException('Role PERSON not found');
      }

      // Validar todos los datos antes de procesar
      const validationErrors: Array<{row: number, email: string, error: string}> = [];
      const validatedData: BulkEmployeeDataDto[] = [];

      for (let i = 0; i < nonEmptyRows.length; i++) {
        const row = nonEmptyRows[i] as any[];
        const originalRowIndex = dataRows.indexOf(row) + 2; // +2 porque empezamos desde la fila 2 (fila 1 es encabezado)

        try {
          // Crear objeto con los datos de la fila
          const rowData: any = {};
          headers.forEach((header, index) => {
            if (row[index] !== undefined && row[index] !== null && row[index] !== '') {
              rowData[header] = row[index];
            }
          });

          // Validar y procesar los datos
          const employeeData = await this.validateAndProcessRowData(rowData, originalRowIndex);
          validatedData.push(employeeData);

        } catch (error) {
          validationErrors.push({
            row: originalRowIndex,
            email: row[headers.indexOf('email')] || 'N/A',
            error: error.message,
          });
        }
      }

      // Si hay errores de validación, detener el proceso
      if (validationErrors.length > 0) {
        await queryRunner.rollbackTransaction();
        return {
          totalProcessed: nonEmptyRows.length,
          successful: 0,
          failed: nonEmptyRows.length,
          errors: validationErrors,
          createdEmployees: [],
        };
      }

      // Procesar todos los empleados en la transacción
      const createdEmployees: Array<{id: number, name: string, email: string}> = [];

      for (const employeeData of validatedData) {
        try {
          // Buscar el usuario existente
          const existingUser = await this.userRepository.findOne({
            where: { email: employeeData.email },
          });

          this.logger.log(`Processing employee with email: ${employeeData.email}`);
          this.logger.log(`Existing user found: ${existingUser ? `ID: ${existingUser.id}, Name: ${existingUser.name}` : 'Not found'}`);

          if (!existingUser) {
            await queryRunner.rollbackTransaction();
            throw new BadRequestException(
              `No se encontró el usuario con email ${employeeData.email}. El usuario debe registrarse primero en la plataforma.`
            );
          }

          // Validar que el ID del usuario sea un número válido
          if (!existingUser.id || isNaN(Number(existingUser.id))) {
            await queryRunner.rollbackTransaction();
            throw new BadRequestException(
              `ID de usuario inválido para el email ${employeeData.email}. ID: ${existingUser.id}`
            );
          }

          // Verificar que el usuario no esté ya asociado a una empresa
          if (existingUser.employer) {
            this.logger.warn(`User ${existingUser.name} (${employeeData.email}) is already associated with company: ${existingUser.employer.name}`);
            throw new BadRequestException(`El usuario ${existingUser.name} (${employeeData.email}) ya está asociado a otra empresa`);
          }

          this.logger.log(`Associating user ${existingUser.id} with company ${company.id}`);

          // Asociar el usuario a la empresa
          existingUser.employer = company;
          await this.userRepository.save(existingUser);

          // Crear registro en el historial de la empresa
          const startDate = employeeData.startDate ? new Date(employeeData.startDate) : new Date();
          
          const companyHistory = this.companyHistoryRepository.create({
            user: existingUser,
            company: company,
            startDate: startDate,
            isActive: true,
          });

          await this.companyHistoryRepository.save(companyHistory);

          createdEmployees.push({
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
          });

        } catch (error) {
          // Si hay un error durante el procesamiento, hacer rollback
          await queryRunner.rollbackTransaction();
          throw new BadRequestException(
            `Error al procesar empleado con email ${employeeData.email}: ${error.message}`
          );
        }
      }

      // Si todo salió bien, hacer commit
      await queryRunner.commitTransaction();

      return {
        totalProcessed: nonEmptyRows.length,
        successful: createdEmployees.length,
        failed: 0,
        errors: [],
        createdEmployees: createdEmployees,
      };

    } catch (error) {
      // Si hay cualquier error, hacer rollback
      await queryRunner.rollbackTransaction();
      this.logger.error('Error processing Excel file:', error);
      throw error;
    } finally {
      // Liberar el query runner
      await queryRunner.release();
    }
  }

  private async validateAndProcessRowData(rowData: any, rowNumber: number): Promise<BulkEmployeeDataDto> {
    // Validar campo requerido
    if (!rowData.email || rowData.email.trim() === '') {
      throw new BadRequestException(`Campo requerido 'email' está vacío en la fila ${rowNumber}`);
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rowData.email.trim())) {
      throw new BadRequestException(`Formato de email inválido en la fila ${rowNumber}: ${rowData.email}`);
    }

    // Buscar usuario existente por email
    const existingUser = await this.userRepository.findOne({
      where: { email: rowData.email.trim().toLowerCase() },
    });

    if (!existingUser) {
      throw new BadRequestException(`No se encontró ningún usuario registrado con el email ${rowData.email} en la fila ${rowNumber}. El usuario debe registrarse primero en la plataforma.`);
    }

    // Validar formato de fecha de inicio (si existe)
    if (rowData.startDate && rowData.startDate.trim() !== '') {
      const startDate = new Date(rowData.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException(`Formato de fecha inválido para 'startDate' en la fila ${rowNumber}`);
      }
    }

    return {
      email: rowData.email.trim().toLowerCase(),
      position: rowData.position?.trim() || undefined,
      department: rowData.department?.trim() || undefined,
      startDate: rowData.startDate?.trim() || undefined,
    };
  }

  private generateTemporaryPassword(): string {
    // Generar contraseña temporal de 8 caracteres
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async generateTemplate(): Promise<Buffer> {
    // Crear datos de ejemplo para la plantilla con solo una fila de ejemplo
    const templateData = [
      {
        email: 'juan.perez@ejemplo.com',
        position: 'Desarrollador Senior',
        department: 'Tecnología',
        startDate: '2024-01-01',
      },
    ];

    // Crear workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados');

    // Convertir a buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }
} 