-- Software tasks keep their existing layer. Physical disciplines are stored
-- in versioned plan metadata, without coercing them to a software layer.
ALTER TABLE "tasks" ALTER COLUMN "layer" DROP NOT NULL;
