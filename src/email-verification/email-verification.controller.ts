// src/email-verification/email-verification.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { EmailVerificationService } from "./services/email-verification.service";
import { ApplicationStatus } from "../application/entities/application.entity";
import { Public } from "../auth/decorators/public.decorator";
import { RolesGuard } from "../auth/guard/roles.guard";
import { Roles } from "../auth/decorators/role.decorator";
import { AuthGuard } from "../auth/guard/auth.guard";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";

@ApiTags("Email Verification")
@Controller("email-verification")
@UseGuards(RolesGuard)
export class EmailVerificationController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService, // eslint-disable-line no-unused-vars
  ) {}

  @Public()
  @Post("send")
  @ApiOperation({ summary: "Send verification email to user" })
  @ApiResponse({
    status: 200,
    description: "Verification email sent successfully",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        userId: { type: "number", description: "User ID" },
        email: { type: "string", description: "Email address" },
      },
      required: ["userId", "email"],
    },
  })
  async sendVerificationEmail(
    @Body("userId") userId: number,
    @Body("email") email: string,
  ): Promise<{ message: string }> {
    await this.emailVerificationService.sendVerificationEmail(userId, email);
    return { message: "Verification email sent successfully" };
  }

  @Public()
  @Post("verify")
  @ApiOperation({ summary: "Verify email using token" })
  @ApiResponse({ status: 200, description: "Email verified successfully" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        token: { type: "string", description: "Verification token" },
      },
      required: ["token"],
    },
  })
  async verifyEmail(
    @Body("token") token: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.emailVerificationService.verifyEmail(token);
  }

  @Public()
  @Post("resend")
  @ApiOperation({ summary: "Resend verification email" })
  @ApiResponse({
    status: 200,
    description: "Verification email resent successfully",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address" },
      },
      required: ["email"],
    },
  })
  async resendVerificationEmail(
    @Body("email") email: string,
  ): Promise<{ message: string }> {
    await this.emailVerificationService.resendVerificationEmail(email);
    return { message: "Verification email resent successfully" };
  }

  @Roles("ADMIN")
  @Get("user/:userId")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get email verification status for a user" })
  @ApiParam({ name: "userId", description: "User ID" })
  async getUserVerificationStatus(): Promise<{
    verified: boolean;
    email?: string;
  }> {
    // Aquí podrías implementar una función en el service para obtener el estado
    // Por ahora retornamos un placeholder
    return { verified: false };
  }

  @Public()
  @Get("status/:email")
  @ApiOperation({
    summary: "Get email verification status for a user by email",
  })
  @ApiParam({ name: "email", description: "Email address" })
  @ApiResponse({
    status: 200,
    description: "Email verification status retrieved successfully",
  })
  async getEmailVerificationStatus(
    @Param("email") email: string,
  ): Promise<{ verified: boolean; email: string; message: string }> {
    const user = await this.emailVerificationService.getUserByEmail(email);

    if (!user) {
      return { verified: false, email, message: "User not found" };
    }

    return {
      verified: user.email_verified,
      email,
      message: user.email_verified
        ? "Email is verified"
        : "Email is not verified",
    };
  }

  @Public()
  @Post("send-application-status")
  @ApiOperation({ summary: "Send application status email to candidate" })
  @ApiResponse({
    status: 200,
    description: "Application status email sent successfully",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Candidate email address" },
        candidateName: { type: "string", description: "Candidate full name" },
        companyName: { type: "string", description: "Company name" },
        jobTitle: { type: "string", description: "Job position title" },
        status: {
          type: "string",
          enum: [
            ApplicationStatus.INTERVIEW,
            ApplicationStatus.ACCEPTED,
            ApplicationStatus.REJECTED,
          ],
          description: "Application status",
        },
        customMessage: {
          type: "string",
          description: "Optional custom message from company",
        },
        customDescription: {
          type: "string",
          description: "Optional custom description",
        },
      },
      required: ["email", "candidateName", "companyName", "jobTitle", "status"],
    },
  })
  async sendApplicationStatusEmail(
    @Body("email") email: string,
    @Body("candidateName") candidateName: string,
    @Body("companyName") companyName: string,
    @Body("jobTitle") jobTitle: string,
    @Body("status")
    status:
      | ApplicationStatus.INTERVIEW
      | ApplicationStatus.ACCEPTED
      | ApplicationStatus.REJECTED,
    @Body("customMessage") customMessage?: string,
    @Body("customDescription") customDescription?: string,
  ): Promise<{ message: string }> {
    await this.emailVerificationService.sendApplicationStatusEmailWithBrevo(
      email,
      candidateName,
      companyName,
      jobTitle,
      status,
      customMessage,
      customDescription,
    );
    return { message: "Application status email sent successfully" };
  }

  @Public()
  @Post("send-service-contract-notification")
  @ApiOperation({ summary: "Send service contract notification email" })
  @ApiResponse({
    status: 200,
    description: "Service contract notification email sent successfully",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        recipientEmail: { 
          type: "string", 
          description: "Recipient email address",
          example: "usuario@ejemplo.com"
        },
        recipientName: { 
          type: "string", 
          description: "Recipient full name",
          example: "Diego González"
        },
        notificationType: {
          type: "string",
          enum: [
            "ACCEPTED",
            "REJECTED",
            "IN_PROGRESS"
          ],
          description: "Type of contract notification",
          example: "ACCEPTED"
        },
        contractData: {
          type: "object",
          properties: {
            contractId: { 
              type: "string", 
              description: "Work contract ID",
              example: "123e4567-e89b-12d3-a456-426614174000"
            },
            serviceTitle: { 
              type: "string", 
              description: "Service or publication title",
              example: "Reparación de plomería"
            },
            clientName: { 
              type: "string", 
              description: "Client name (optional)",
              example: "Santiago Rodríguez"
            },
            providerName: { 
              type: "string", 
              description: "Service provider name (optional)",
              example: "Diego González"
            },
            agreedPrice: { 
              type: "number", 
              description: "Agreed service price (optional)",
              example: 150000
            },
            currency: { 
              type: "string", 
              description: "Price currency (optional)",
              example: "COP"
            },
            customMessage: { 
              type: "string", 
              description: "Custom message to include (optional)",
              example: "Necesito el servicio con urgencia para el viernes"
            }
          },
          required: ["contractId", "serviceTitle"]
        }
      },
      required: ["recipientEmail", "recipientName", "notificationType", "contractData"],
    },
  })
  async sendServiceContractNotification(
    @Body("recipientEmail") recipientEmail: string,
    @Body("recipientName") recipientName: string,
    @Body("notificationType") notificationType: 
      | "ACCEPTED"
      | "REJECTED"
      | "IN_PROGRESS",
    @Body("contractData") contractData: {
      contractId: string;
      serviceTitle: string;
      clientName?: string;
      providerName?: string;
      agreedPrice?: number;
      currency?: string;
      customMessage?: string;
    }
  ): Promise<{ message: string }> {
    await this.emailVerificationService.sendServiceContractNotificationEmail(
      recipientEmail,
      recipientName,
      notificationType,
      contractData
    );
    return { message: "Service contract notification email sent successfully" };
  }

  @Post("send-employee-removal-notification")
  @Roles("ADMIN", "BUSINESS")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ 
    summary: "Send employee removal notification email",
    description: "Send notification email to an employee when they are removed from a company"
  })
  @ApiResponse({
    status: 200,
    description: "Employee removal notification email sent successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin or Business role required",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        employeeEmail: { 
          type: "string", 
          description: "Email of the employee being removed",
          example: "empleado@ejemplo.com"
        },
        employeeName: { 
          type: "string", 
          description: "Name of the employee being removed",
          example: "Juan Pérez"
        },
        companyName: { 
          type: "string", 
          description: "Name of the company removing the employee",
          example: "Empresa de Prueba"
        },
        removalReason: { 
          type: "string", 
          enum: ["TERMINATION", "RESIGNATION", "END_OF_CONTRACT", "OTHER"],
          description: "Reason for the employee removal",
          example: "TERMINATION"
        },
        customMessage: { 
          type: "string", 
          description: "Custom message to include in the email",
          example: "Agradecemos tu dedicación durante este tiempo."
        },
        endDate: { 
          type: "string", 
          format: "date",
          description: "End date of employment (ISO date string)",
          example: "2025-07-20"
        }
      },
      required: ["employeeEmail", "employeeName", "companyName"],
    },
  })
  async sendEmployeeRemovalNotification(
    @Body("employeeEmail") employeeEmail: string,
    @Body("employeeName") employeeName: string,
    @Body("companyName") companyName: string,
    @Body("removalReason") removalReason?: "TERMINATION",
    @Body("customMessage") customMessage?: string,
    @Body("endDate") endDate?: string
  ): Promise<{ message: string }> {
    const parsedEndDate = endDate ? new Date(endDate) : undefined;
    
    await this.emailVerificationService.sendEmployeeRemovalNotificationEmail(
      employeeEmail,
      employeeName,
      companyName,
      removalReason,
      customMessage,
      parsedEndDate
    );
    return { message: "Employee removal notification email sent successfully" };
  }
}

