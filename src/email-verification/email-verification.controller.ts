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
}
