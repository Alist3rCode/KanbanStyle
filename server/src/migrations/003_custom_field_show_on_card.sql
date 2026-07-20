ALTER TABLE custom_fields ADD COLUMN show_on_card TEXT NOT NULL DEFAULT 'never'
    CHECK (show_on_card IN ('always', 'if_not_empty', 'never'));
