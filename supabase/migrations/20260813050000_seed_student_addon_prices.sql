UPDATE plans SET addon_student_price_inr = 5 WHERE id = 'starter' AND addon_student_price_inr IS NULL;
UPDATE plans SET addon_student_price_inr = 3 WHERE id = 'growth' AND addon_student_price_inr IS NULL;
