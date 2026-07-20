-- A custom field created from within a card (rather than the board's
-- task template) is scoped to that one card only: card_id is set, and
-- it never appears on — or gets instantiated onto — other cards.
ALTER TABLE custom_fields ADD COLUMN card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE;
