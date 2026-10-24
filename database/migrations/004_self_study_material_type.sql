ALTER TABLE materials
DROP CONSTRAINT IF EXISTS material_type_check;

ALTER TABLE materials
ADD CONSTRAINT material_type_check
CHECK (
    material_type IN (
        'lecture',
        'presentation',
        'methodical',
        'self_study',
        'other'
    )
);
