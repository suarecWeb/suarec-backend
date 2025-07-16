import { IsEnum, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { PaymentStatus } from "../../enums/paymentMethod.enum";

export class UpdatePaymentStatusDto {
  @ApiProperty({
    description: "Nuevo estado del pago",
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
  })
  @IsNotEmpty()
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}
