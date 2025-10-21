import { IsEnum } from "class-validator";

export class UpdateProposalStatusDto {
  @IsEnum(["pending", "accepted", "rejected"])
  status!: "pending" | "accepted" | "rejected";
}




