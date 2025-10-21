import { Inject, Injectable, ForbiddenException } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UseCase } from "../../../../shared/application/use-case.js";
import { SUPABASE_CLIENT } from "../../../../core/constants/injection-tokens.js";

interface Input {
  ownerId: string;
  actorId: string;
  fileName: string;
}

interface Output {
  path: string;
  uploadUrl: string;
}

@Injectable()
export class GenerateEquipmentUploadUrlUseCase
  implements UseCase<Input, Output>
{
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly client: SupabaseClient
  ) {}

  async execute({ ownerId, actorId, fileName }: Input): Promise<Output> {
    if (ownerId !== actorId) {
      throw new ForbiddenException(
        "You are not allowed to upload images for this equipment"
      );
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${ownerId}/${Date.now()}-${sanitizedFileName}`;

    const { data, error } = await this.client.storage
      .from("equipments")
      .createSignedUploadUrl(path, { upsert: true });

    if (error || !data) {
      throw error ?? new Error("Unable to generate upload URL");
    }

    return {
      path,
      uploadUrl: data.signedUrl,
    };
  }
}
