-- Run once in Supabase SQL Editor: stops two overlapping tracker runs from creating the same letter twice.
create unique index if not exists escalations_complaint_level_uniq on escalations (complaint_id, level);
