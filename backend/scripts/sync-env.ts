import { writeFileSync } from "fs";
import { envSchema } from "src/shared/config/env.schema";

const shape = envSchema.shape;

const output = Object.keys(shape)
  .map((key) => `${key}=`)
  .join("\n");

writeFileSync(".env.example", output);