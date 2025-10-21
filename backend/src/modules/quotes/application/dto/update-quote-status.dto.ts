import { IsEnum } from "class-validator";

export class UpdateQuoteStatusDto {
  @IsEnum(["pending", "answered", "cancelled"])
  status!: "pending" | "answered" | "cancelled";
}





