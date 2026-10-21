import { ArrayMaxSize, ArrayMinSize, IsArray } from 'class-validator';

export class CreateEventBatchDto {
  // Each item is validated individually in the service (not via nested
  // class-validator) so one malformed event doesn't reject the whole batch.
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200) // hard ceiling; the configured max_batch_size is enforced in the service
  events: Record<string, unknown>[];
}
