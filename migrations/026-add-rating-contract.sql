-- Add contract relation to ratings
ALTER TABLE ratings
  ADD COLUMN "contractId" uuid NULL;

ALTER TABLE ratings
  ADD CONSTRAINT fk_ratings_contract
  FOREIGN KEY ("contractId")
  REFERENCES contract(id)
  ON DELETE SET NULL;

ALTER TABLE ratings
  ADD CONSTRAINT uq_ratings_contract_reviewer
  UNIQUE ("contractId", "reviewerId");
