import { IsEnum } from "class-validator";

export class UpdateBookingStatusDto {
  @IsEnum(["pending", "confirmed", "completed", "cancelled"])
  status!: "pending" | "confirmed" | "completed" | "cancelled";
}





