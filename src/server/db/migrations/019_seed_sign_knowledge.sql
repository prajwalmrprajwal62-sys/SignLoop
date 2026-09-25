-- 019_seed_sign_knowledge.sql
-- Hardcoded instructional knowledge for the demo/hackathon prototype.
-- Stored as APPROVED_TRAINING (globally available to all students).
-- Written in natural instructional language so FTS5 retrieval works well
-- on student questions like "how do I do the WATER sign?" or "why does my HELP keep failing?"

INSERT OR IGNORE INTO knowledge_sources (
  source_id, source_class, profile_id, context, intent_id, task_id, author_id, author_role,
  source_title, content, content_type, locale, status, version, supersedes_id,
  session_id, event_id, consent_scope, retention_class, created_at, updated_at
) VALUES

-- HELP gesture
(
  'seed-help-001', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', 'HELP', NULL, NULL, 'SYSTEM',
  'HELP gesture — technique guide',
  'The HELP gesture is a distress signal. Open your dominant hand flat with the palm facing up. Place your non-dominant fist on top of the open palm. Lift both hands upward together — the movement represents someone being lifted or needing support. The most common mistake is using only one hand. Always use both hands together for this gesture. Practice the upward lift motion smoothly. This sign is critical for emergency communication — practice it until it is instinctive.',
  'GESTURE_SPEC', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
),

-- WATER gesture
(
  'seed-water-001', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', 'WATER', NULL, NULL, 'SYSTEM',
  'WATER gesture — technique guide',
  'The WATER sign uses the letter W handshape. Extend your index, middle, and ring fingers while keeping your thumb and pinky folded. Tap the index finger side of your hand against your chin twice. The motion should be a clean, repeated tap — not a rub. Students often confuse WATER with DRINK; the difference is that DRINK mimes a cup tipping toward your lips. Keep your wrist relaxed. Tap from your chin, not from your mouth. Consistent chin placement is key for clarity.',
  'GESTURE_SPEC', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
),

-- FOOD gesture
(
  'seed-food-001', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', 'FOOD', NULL, NULL, 'SYSTEM',
  'FOOD gesture — technique guide',
  'The FOOD sign is made by bringing your fingertips together to form a flat O shape and tapping them to your lips twice. Think of bringing food to your mouth. The movement is small and close to the face — do not extend your arm outward. Students frequently make the gesture too large or tap the wrong location. The target is your lips, not your chin or cheek. Both hands can be used for emphasis but one hand is standard. Keep the motion gentle and deliberate.',
  'GESTURE_SPEC', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
),

-- PAIN gesture
(
  'seed-pain-001', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', 'PAIN', NULL, NULL, 'SYSTEM',
  'PAIN gesture — technique guide',
  'The PAIN or HURT sign is made by pointing both index fingers toward each other and twisting them in opposite directions near the location of pain. For general pain, perform this near the center of your body. The twisting motion indicates something is wrong or hurting. Do not poke the fingers at each other — the rotation is the key element. Students often make this sign too small. Make the gesture visible and clear. You can indicate the specific location of pain by signing near that body part.',
  'GESTURE_SPEC', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
),

-- DOCTOR gesture
(
  'seed-doctor-001', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', 'DOCTOR', NULL, NULL, 'SYSTEM',
  'DOCTOR gesture — technique guide',
  'The DOCTOR sign is made by extending your dominant hand in a D handshape or by tapping your middle finger on the inside of your non-dominant wrist — where a doctor checks your pulse. The wrist tap version is most commonly understood. Tap gently twice. This should feel like a doctor checking your heartbeat or pulse. Students sometimes confuse this with NURSE; the distinction is the specific wrist location and the D-handshape. In real-world settings, combining this with pointing toward a room or direction adds clarity.',
  'GESTURE_SPEC', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
),

-- MEDICINE gesture
(
  'seed-medicine-001', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', 'MEDICINE', NULL, NULL, 'SYSTEM',
  'MEDICINE gesture — technique guide',
  'The MEDICINE sign involves placing your middle finger on your non-dominant palm and rocking it back and forth, like mixing medicine in a mortar. The motion is a small circular or rocking movement. Keep the rest of your fingers extended slightly. This gesture represents the idea of preparing or needing medication. Students often forget the rocking motion and just tap the palm — make sure the circular rock is clear and deliberate. Pair this with HELP or DOCTOR for urgency in real-world communication.',
  'GESTURE_SPEC', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
),

-- WASHROOM gesture
(
  'seed-washroom-001', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', 'WASHROOM', NULL, NULL, 'SYSTEM',
  'WASHROOM gesture — technique guide',
  'The WASHROOM or BATHROOM sign is made by forming a T handshape with your dominant hand — tuck your thumb between your index and middle fingers. Shake or twist the wrist slightly from side to side. This is a universally recognized sign in most sign language systems. The movement should be visible but small — about two shakes. Students often skip the T handshape and just shake their hand loosely. The T formation is the key differentiator. Practice forming the T quickly before shaking.',
  'GESTURE_SPEC', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
),

-- YES gesture
(
  'seed-yes-001', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', 'YES', NULL, NULL, 'SYSTEM',
  'YES gesture — technique guide',
  'The YES sign is made by closing your dominant hand into an S or A handshape and nodding it up and down at the wrist — like your hand is nodding yes. The motion mirrors a head nod. Keep it clean and deliberate — two or three nods is standard. Do not bounce the whole arm; the movement is at the wrist. Students sometimes wave the hand instead of nodding it. Pair YES with a genuine facial nod for emphasis and clarity. Speed can indicate enthusiasm or certainty.',
  'GESTURE_SPEC', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
),

-- NO gesture
(
  'seed-no-001', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', 'NO', NULL, NULL, 'SYSTEM',
  'NO gesture — technique guide',
  'The NO sign uses your index and middle fingers extended, snapping them closed against your thumb twice — like two fingers clicking shut. It is a quick closing motion, not a wave. Facial expression matters enormously for NO — furrowed brow and slight head shake make the sign unmistakable. Students often confuse this with a pointing gesture. Make sure the double snap is clear. A sharp, definitive motion communicates firmness. A softer version with one snap can communicate polite refusal.',
  'GESTURE_SPEC', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
),

-- REPEAT gesture
(
  'seed-repeat-001', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', 'REPEAT', NULL, NULL, 'SYSTEM',
  'REPEAT gesture — technique guide',
  'The REPEAT or AGAIN sign is made with a bent hand where your fingers are curled at the middle joints. Bring this bent hand down to land flat on your non-dominant palm, then arc up and do it again — the motion traces a small loop that lands on your palm twice. It represents doing something again. Students often confuse REPEAT with AGAIN vs CONTINUE — make the arcing loop motion clear. Do not just tap the palm twice without the arc. The arc communicates the cyclic nature of repetition.',
  'GESTURE_SPEC', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
),

-- THANK YOU gesture
(
  'seed-thankyou-001', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', 'THANK_YOU', NULL, NULL, 'SYSTEM',
  'THANK YOU gesture — technique guide',
  'The THANK YOU sign is made by touching the fingertips of your flat hand to your chin, then moving the hand forward and slightly downward — as if blowing a kiss of gratitude. The starting point is your chin. Movement is outward, away from the face. Students sometimes start from the lips or the chest — always start from the chin. The motion should feel warm and genuine. Pair with a genuine smile for full effect. A two-handed version with both hands moving outward conveys deep gratitude.',
  'GESTURE_SPEC', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
),

-- General sign language tips
(
  'seed-general-001', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', NULL, NULL, NULL, 'SYSTEM',
  'General sign language learning tips',
  'Sign language is a visual language — facial expressions are as important as hand shapes. Always combine your hand gestures with appropriate facial expression. Speed matters: slow, deliberate signs are clearer for beginners and people who are still learning to read signs. Practice in front of a mirror to see what your signs actually look like to others. Consistency is more important than perfection — a sign used consistently in the same way will be understood even if it slightly differs from textbook form. If someone does not understand, do not just repeat the same sign faster — try a different gesture or spell it out.',
  'INSTRUCTION', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
),

-- Common mistakes across gestures
(
  'seed-general-002', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', NULL, NULL, NULL, 'SYSTEM',
  'Common mistakes in sign language and how to fix them',
  'The most common mistakes in learning sign language are: (1) incorrect handshape — practice each handshape slowly in isolation before combining with movement; (2) wrong location — many signs look similar but happen at different body locations, so location precision matters; (3) missing the movement path — signs like REPEAT have a specific arc, not just a tap; (4) ignoring facial grammar — in sign language, facial expression is not optional, it carries meaning; (5) signing too fast before the shape is correct — slow down and get the form right first, then build speed. If you keep failing the model check on a specific gesture, focus on that gesture in isolation for 5–10 repetitions before combining with others.',
  'INSTRUCTION', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
),

-- When to use which gesture
(
  'seed-general-003', 'APPROVED_TRAINING', NULL, 'LEARNING_PRACTICE', NULL, NULL, NULL, 'SYSTEM',
  'When and how to use each gesture in real communication',
  'In real-world healthcare and daily communication, the priority order for learning is: HELP and PAIN first (emergency), then WATER and FOOD (basic needs), then DOCTOR and MEDICINE (healthcare), then WASHROOM (daily need), then YES and NO (responses), then THANK YOU (social), then REPEAT (clarification). Combining gestures increases communication clarity: HELP + PAIN signals medical emergency, WATER + FOOD together means general hunger/thirst, DOCTOR + MEDICINE suggests a prescription situation. Practice combination gestures once individual signs are solid.',
  'INSTRUCTION', 'en-IN', 'APPROVED', 1, NULL, NULL, NULL, 'LEARNING_PRACTICE', 'PERMANENT_AUDIT',
  '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
);
