import type { ExerciseTemplate } from '../types'

const ex = (
  id: string,
  name: string,
  category: ExerciseTemplate['category'],
  pattern: ExerciseTemplate['pattern'],
  primaryMuscle: string,
  secondaryMuscles: string[],
  equipment: ExerciseTemplate['equipment'],
  difficulty: ExerciseTemplate['difficulty'],
  impact: ExerciseTemplate['impact'],
  injuryExclusions: ExerciseTemplate['injuryExclusions'],
  goalTags: ExerciseTemplate['goalTags'],
  instructions: string,
): ExerciseTemplate => ({
  id,
  name,
  category,
  pattern,
  primaryMuscle,
  secondaryMuscles,
  equipment,
  difficulty,
  impact,
  injuryExclusions,
  goalTags,
  instructions,
})

/**
 * Curated exercise metadata. Instructions are deliberately concise and
 * conservative; they are not a substitute for coaching or medical advice.
 */
export const EXERCISE_LIBRARY: ExerciseTemplate[] = [
  // ---------------------------------------------------------------- squat
  ex('squat-back', 'Barbell back squat', 'strength', 'squat', 'Quads', ['Glutes', 'Core'], ['gym'], 'intermediate', 'low', ['Knee', 'Back'], ['strength', 'muscle'], 'Brace your trunk, sit down between your hips and keep your knees tracking over your toes. Stand by driving through the whole foot.'),
  ex('squat-front', 'Front squat', 'strength', 'squat', 'Quads', ['Glutes', 'Upper back'], ['gym'], 'advanced', 'low', ['Knee', 'Back'], ['strength', 'muscle'], 'Keep your elbows high and torso tall as you descend. Use a depth you can control without rounding your lower back.'),
  ex('squat-goblet', 'Goblet squat', 'strength', 'squat', 'Quads', ['Glutes', 'Core'], ['dumbbells', 'gym'], 'beginner', 'low', ['Knee'], ['muscle', 'health'], 'Hold one dumbbell at chest height. Sit straight down between your knees, then push the floor away to stand.'),
  ex('squat-bodyweight', 'Bodyweight squat', 'strength', 'squat', 'Quads', ['Glutes'], ['bodyweight', 'mat'], 'beginner', 'low', ['Knee'], ['health', 'longevity'], 'Stand with feet shoulder-width apart, reach your hips back and down, then stand tall. Keep the movement pain-free.'),
  ex('squat-box', 'Box squat', 'strength', 'squat', 'Quads', ['Glutes', 'Hamstrings'], ['gym'], 'intermediate', 'low', ['Knee'], ['strength'], 'Sit back to a box with control, pause briefly without relaxing, then stand. Keep your shins close to vertical.'),
  ex('squat-wall-sit', 'Wall sit', 'strength', 'squat', 'Quads', ['Glutes'], ['bodyweight'], 'beginner', 'low', [], ['endurance', 'health'], 'Slide down a wall until your knees are bent comfortably, then hold. Stop if knee discomfort increases.'),

  // ---------------------------------------------------------------- hinge
  ex('hinge-rdl', 'Romanian deadlift', 'strength', 'hinge', 'Hamstrings', ['Glutes', 'Back'], ['gym', 'dumbbells'], 'intermediate', 'low', ['Back'], ['strength', 'muscle'], 'Push your hips back with a neutral spine and let the weights travel close to your legs. Stand by squeezing your glutes.'),
  ex('hinge-deadlift', 'Conventional deadlift', 'strength', 'hinge', 'Glutes', ['Hamstrings', 'Back', 'Grip'], ['gym'], 'advanced', 'low', ['Back', 'Knee'], ['strength', 'muscle'], 'Brace, take the slack out of the bar and push the floor away. Keep the bar close and avoid jerking off the floor.'),
  ex('hinge-hip-thrust', 'Hip thrust', 'strength', 'hinge', 'Glutes', ['Hamstrings'], ['gym', 'dumbbells'], 'beginner', 'low', ['Back'], ['muscle', 'health'], 'Rest your upper back on a bench, drive through your heels and squeeze your glutes at the top without arching your lower back.'),
  ex('hinge-glute-bridge', 'Glute bridge', 'strength', 'hinge', 'Glutes', ['Hamstrings', 'Core'], ['bodyweight', 'mat'], 'beginner', 'low', [], ['health', 'longevity'], 'Lie on your back with knees bent, press through your heels and lift your hips. Keep your ribs down.'),
  ex('hinge-single-leg-rdl', 'Single-leg Romanian deadlift', 'strength', 'hinge', 'Hamstrings', ['Glutes', 'Core'], ['dumbbells', 'bodyweight'], 'intermediate', 'low', ['Back', 'Ankle'], ['strength', 'health'], 'Hinge at one hip while the free leg extends behind you. Keep your hips square and use a wall for balance if needed.'),
  ex('hinge-kettlebell-swing', 'Kettlebell swing', 'conditioning', 'hinge', 'Glutes', ['Hamstrings', 'Core'], ['gym'], 'intermediate', 'moderate', ['Back'], ['fat-loss', 'endurance'], 'Hinge and snap your hips to float the bell to chest height. The arms stay relaxed; the hips create the power.'),
  ex('hinge-good-morning', 'Good morning', 'strength', 'hinge', 'Hamstrings', ['Glutes', 'Back'], ['gym'], 'advanced', 'low', ['Back'], ['strength'], 'With a light bar on your upper back, hinge with a neutral spine and return by driving your hips forward.'),
  ex('hinge-cable-pullthrough', 'Cable pull-through', 'strength', 'hinge', 'Glutes', ['Hamstrings'], ['gym'], 'beginner', 'low', ['Back'], ['muscle', 'health'], 'Face away from a low cable, hinge back until you feel a hamstring stretch, then stand tall by squeezing your glutes.'),

  // ---------------------------------------------------------------- lunge
  ex('lunge-walking', 'Walking lunge', 'strength', 'lunge', 'Quads', ['Glutes', 'Core'], ['bodyweight', 'dumbbells'], 'beginner', 'moderate', ['Knee', 'Ankle'], ['muscle', 'health'], 'Step forward and lower until both knees are comfortably bent. Push through the front foot to step into the next repetition.'),
  ex('lunge-reverse', 'Reverse lunge', 'strength', 'lunge', 'Quads', ['Glutes', 'Hamstrings'], ['bodyweight', 'dumbbells'], 'beginner', 'low', ['Knee'], ['health', 'muscle'], 'Step one foot back, lower under control and return to standing. Keep most of your weight through the front foot.'),
  ex('lunge-bulgarian', 'Bulgarian split squat', 'strength', 'lunge', 'Quads', ['Glutes', 'Core'], ['dumbbells', 'bodyweight'], 'intermediate', 'low', ['Knee', 'Ankle'], ['muscle', 'strength'], 'Place the rear foot on a low bench and lower straight down. Use a depth that keeps the front knee comfortable.'),
  ex('lunge-step-up', 'Step-up', 'strength', 'lunge', 'Quads', ['Glutes'], ['bodyweight', 'dumbbells'], 'beginner', 'low', ['Knee'], ['health', 'muscle'], 'Step onto a stable box and stand tall without pushing hard off the trailing leg. Step down with control.'),
  ex('lunge-split-squat', 'Split squat', 'strength', 'lunge', 'Quads', ['Glutes'], ['bodyweight', 'dumbbells'], 'beginner', 'low', ['Knee'], ['health', 'longevity'], 'Stand in a split stance and lower straight down. Keep both feet planted and torso upright.'),

  // ---------------------------------------------------------------- push
  ex('push-bench', 'Barbell bench press', 'strength', 'push', 'Chest', ['Triceps', 'Shoulders'], ['gym'], 'intermediate', 'low', ['Shoulder'], ['strength', 'muscle'], 'Plant your feet, lower the bar to your mid-chest with control and press back over your shoulders. Use a spotter or safety pins.'),
  ex('push-incline-db', 'Incline dumbbell press', 'strength', 'push', 'Chest', ['Shoulders', 'Triceps'], ['dumbbells', 'gym'], 'intermediate', 'low', ['Shoulder'], ['muscle'], 'Press two dumbbells from shoulder level to over your chest. Keep your shoulder blades set and wrists stacked.'),
  ex('push-pushup', 'Push-up', 'strength', 'push', 'Chest', ['Triceps', 'Core'], ['bodyweight', 'mat'], 'beginner', 'low', ['Shoulder'], ['muscle', 'health'], 'Keep a straight line from head to heels and lower your chest between your hands. Elevate your hands to make it easier.'),
  ex('push-knee-pushup', 'Knee push-up', 'strength', 'push', 'Chest', ['Triceps', 'Core'], ['bodyweight', 'mat'], 'beginner', 'low', [], ['health', 'longevity'], 'Perform a push-up from your knees while keeping a straight line through your torso. Lower with control.'),
  ex('push-db-floor', 'Dumbbell floor press', 'strength', 'push', 'Chest', ['Triceps'], ['dumbbells'], 'beginner', 'low', ['Shoulder'], ['muscle', 'strength'], 'Lie on the floor and press the dumbbells up. Let your upper arms rest briefly on the floor at the bottom.'),
  ex('push-machine-chest', 'Machine chest press', 'strength', 'push', 'Chest', ['Triceps', 'Shoulders'], ['gym'], 'beginner', 'low', [], ['muscle', 'health'], 'Set the handles at chest height and press without locking out aggressively. Keep your shoulders down and back.'),
  ex('push-band-chest', 'Band chest press', 'strength', 'push', 'Chest', ['Triceps'], ['bands'], 'beginner', 'low', ['Shoulder'], ['health', 'muscle'], 'Anchor a band behind you and press both hands forward. Keep your ribs down and move slowly.'),
  ex('push-cable-fly', 'Cable chest fly', 'strength', 'push', 'Chest', ['Shoulders'], ['gym'], 'intermediate', 'low', ['Shoulder'], ['muscle'], 'With a soft elbow bend, bring the handles together in front of your chest. Avoid overstretching at the back.'),

  // ------------------------------------------------------- push-overhead
  ex('push-overhead-barbell', 'Barbell overhead press', 'strength', 'push-overhead', 'Shoulders', ['Triceps', 'Core'], ['gym'], 'intermediate', 'low', ['Shoulder', 'Back'], ['strength'], 'Brace your trunk and press the bar overhead without leaning back. Finish with the bar over your mid-foot.'),
  ex('push-overhead-db', 'Dumbbell shoulder press', 'strength', 'push-overhead', 'Shoulders', ['Triceps'], ['dumbbells'], 'beginner', 'low', ['Shoulder'], ['muscle'], 'Press the dumbbells overhead until your arms are straight. Keep your lower back neutral and ribs down.'),
  ex('push-pike', 'Pike push-up', 'strength', 'push-overhead', 'Shoulders', ['Triceps', 'Core'], ['bodyweight', 'mat'], 'intermediate', 'low', ['Shoulder'], ['muscle', 'strength'], 'From a downward-dog position, lower the top of your head toward the floor and press back up. Keep the neck long.'),
  ex('push-band-overhead', 'Banded overhead press', 'strength', 'push-overhead', 'Shoulders', ['Triceps'], ['bands'], 'beginner', 'low', ['Shoulder'], ['health', 'muscle'], 'Stand on the band and press the handles overhead. Keep the movement slow and avoid shrugging.'),
  ex('push-lateral-raise', 'Dumbbell lateral raise', 'strength', 'push-overhead', 'Shoulders', ['Upper back'], ['dumbbells'], 'beginner', 'low', ['Shoulder'], ['muscle'], 'Raise the dumbbells out to the sides with a slight elbow bend. Stop around shoulder height.'),

  // ---------------------------------------------------------------- pull
  ex('pull-bent-row', 'Bent-over row', 'strength', 'pull', 'Back', ['Biceps', 'Rear delts'], ['gym', 'dumbbells'], 'intermediate', 'low', ['Back'], ['strength', 'muscle'], 'Hinge to a stable position and pull the weight toward your lower ribs. Keep your spine neutral.'),
  ex('pull-chest-supported', 'Chest-supported row', 'strength', 'pull', 'Back', ['Biceps'], ['gym'], 'beginner', 'low', [], ['muscle', 'health'], 'Lie chest-down on an incline bench and row the handles toward your ribs. Squeeze your shoulder blades without shrugging.'),
  ex('pull-cable-row', 'Seated cable row', 'strength', 'pull', 'Back', ['Biceps'], ['gym'], 'beginner', 'low', ['Back'], ['muscle'], 'Sit tall, pull the handle toward your stomach and return with control. Avoid rocking your torso.'),
  ex('pull-band-row', 'Band row', 'strength', 'pull', 'Back', ['Biceps', 'Rear delts'], ['bands'], 'beginner', 'low', [], ['health', 'muscle'], 'Anchor a band at chest height and pull toward your ribs. Keep your shoulders away from your ears.'),
  ex('pull-inverted-row', 'Inverted row', 'strength', 'pull', 'Back', ['Biceps', 'Core'], ['bodyweight', 'gym'], 'intermediate', 'low', ['Shoulder'], ['muscle', 'strength'], 'Hang under a fixed bar, keep your body straight and pull your chest toward the bar. Raise the bar to reduce difficulty.'),
  ex('pull-single-arm-db', 'Single-arm dumbbell row', 'strength', 'pull', 'Back', ['Biceps'], ['dumbbells'], 'beginner', 'low', ['Back'], ['muscle'], 'Support yourself on a bench and row the dumbbell toward your hip. Keep your torso still.'),
  ex('pull-face-pull', 'Face pull', 'strength', 'pull', 'Rear delts', ['Upper back'], ['gym', 'bands'], 'beginner', 'low', [], ['health', 'longevity'], 'Pull a rope or band toward your face with elbows high. Finish with your hands beside your ears.'),

  // -------------------------------------------------------- pull-vertical
  ex('pull-lat-pulldown', 'Lat pulldown', 'strength', 'pull-vertical', 'Back', ['Biceps'], ['gym'], 'beginner', 'low', ['Shoulder'], ['muscle'], 'Pull the bar toward your upper chest without leaning far back. Let your shoulder blades rise and settle naturally.'),
  ex('pull-pullup', 'Pull-up', 'strength', 'pull-vertical', 'Back', ['Biceps', 'Core'], ['gym'], 'advanced', 'low', ['Shoulder'], ['strength', 'muscle'], 'Hang with control and pull your chest toward the bar. Lower fully without swinging.'),
  ex('pull-assisted-pullup', 'Assisted pull-up', 'strength', 'pull-vertical', 'Back', ['Biceps'], ['gym'], 'beginner', 'low', ['Shoulder'], ['muscle', 'health'], 'Use a band or assistance machine to complete controlled pull-ups. Choose assistance that allows full-range reps.'),
  ex('pull-band-pulldown', 'Banded lat pulldown', 'strength', 'pull-vertical', 'Back', ['Biceps'], ['bands'], 'beginner', 'low', ['Shoulder'], ['health'], 'Anchor a band overhead and pull the handles down toward your shoulders. Keep your torso tall.'),

  // ---------------------------------------------------------------- core
  ex('core-plank', 'Front plank', 'strength', 'core', 'Core', ['Shoulders', 'Glutes'], ['bodyweight', 'mat'], 'beginner', 'low', [], ['health', 'longevity'], 'Set your elbows under your shoulders and hold a straight line. Stop before your lower back sags.'),
  ex('core-dead-bug', 'Dead bug', 'strength', 'core', 'Core', ['Hip flexors'], ['bodyweight', 'mat'], 'beginner', 'low', [], ['health', 'longevity'], 'Lie on your back with ribs down and extend opposite arm and leg slowly. Keep your lower back gently pressed down.'),
  ex('core-bird-dog', 'Bird dog', 'strength', 'core', 'Core', ['Glutes', 'Back'], ['bodyweight', 'mat'], 'beginner', 'low', [], ['health', 'longevity'], 'From all fours, reach one arm and the opposite leg long. Keep your hips level and spine still.'),
  ex('core-side-plank', 'Side plank', 'strength', 'core', 'Obliques', ['Shoulders', 'Glutes'], ['bodyweight', 'mat'], 'intermediate', 'low', ['Shoulder'], ['health', 'longevity'], 'Stack your shoulders, hips and feet, then lift your hips into a straight line. Use your bottom knee for support if needed.'),
  ex('core-hollow-hold', 'Hollow hold', 'strength', 'core', 'Core', ['Hip flexors'], ['bodyweight', 'mat'], 'intermediate', 'low', ['Back'], ['strength', 'muscle'], 'Press your lower back into the floor and extend your arms and legs only as far as you can control.'),
  ex('core-pallof', 'Pallof press', 'strength', 'core', 'Obliques', ['Core'], ['gym', 'bands'], 'beginner', 'low', [], ['health', 'strength'], 'Stand side-on to a cable or band and press the handle straight out. Resist rotating toward the anchor.'),
  ex('core-carry-farmer', 'Farmer carry', 'strength', 'carry', 'Grip', ['Core', 'Traps'], ['dumbbells', 'gym'], 'beginner', 'low', ['Back'], ['strength', 'health'], 'Walk tall with heavy weights at your sides. Keep your ribs stacked over your hips and take controlled steps.'),
  ex('core-carry-suitcase', 'Suitcase carry', 'strength', 'carry', 'Obliques', ['Grip', 'Core'], ['dumbbells', 'gym'], 'intermediate', 'low', ['Back'], ['strength', 'health'], 'Carry a weight in one hand without leaning to the side. Keep your shoulders level.'),

  // ---------------------------------------------------------------- cardio
  ex('cardio-easy-run', 'Easy run', 'cardio', 'run', 'Aerobic system', ['Calves', 'Quads'], ['bodyweight'], 'beginner', 'moderate', ['Knee', 'Ankle'], ['endurance', 'health', 'fat-loss'], 'Run at a conversational pace. Keep your stride relaxed and stop if pain changes your gait.'),
  ex('cardio-walk-jog', 'Walk-jog intervals', 'cardio', 'run', 'Aerobic system', ['Calves', 'Quads'], ['bodyweight'], 'beginner', 'moderate', ['Knee', 'Ankle'], ['endurance', 'health'], 'Alternate comfortable walking and easy jogging. Build the jogging portions gradually.'),
  ex('cardio-treadmill-intervals', 'Treadmill intervals', 'cardio', 'run', 'Aerobic system', ['Calves', 'Glutes'], ['cardio', 'gym'], 'intermediate', 'high', ['Knee', 'Ankle'], ['endurance', 'fat-loss'], 'Warm up, then alternate faster efforts with easy recovery. Hold the rails only for balance.'),
  ex('cardio-brisk-walk', 'Brisk outdoor walk', 'cardio', 'run', 'Aerobic system', ['Calves', 'Glutes'], ['bodyweight'], 'beginner', 'low', [], ['health', 'longevity', 'fat-loss'], 'Walk at a pace that raises your breathing while staying conversational. Keep a tall posture.'),
  ex('cardio-hill-walk', 'Incline walk', 'cardio', 'run', 'Aerobic system', ['Glutes', 'Calves'], ['cardio', 'gym'], 'beginner', 'low', ['Ankle'], ['health', 'endurance'], 'Walk on a moderate incline without holding the handles. Reduce the incline if your lower back or calves complain.'),
  ex('cardio-row-steady', 'Steady row', 'cardio', 'row', 'Aerobic system', ['Back', 'Legs'], ['cardio', 'gym'], 'beginner', 'low', ['Back'], ['endurance', 'health'], 'Row at a sustainable rhythm: legs, hips, then arms. Keep the chain close to your body.'),
  ex('cardio-row-intervals', 'Rowing intervals', 'conditioning', 'row', 'Aerobic system', ['Back', 'Legs', 'Core'], ['cardio', 'gym'], 'intermediate', 'moderate', ['Back'], ['endurance', 'fat-loss'], 'Alternate harder rowing efforts with easy recovery. Prioritise a strong, repeatable stroke over sprinting.'),
  ex('cardio-bike-steady', 'Steady stationary bike', 'cardio', 'cycle', 'Aerobic system', ['Quads', 'Glutes'], ['cardio', 'gym'], 'beginner', 'low', [], ['endurance', 'health'], 'Ride at a comfortable cadence with light resistance. Keep your knees tracking forward.'),
  ex('cardio-bike-intervals', 'Bike intervals', 'cardio', 'cycle', 'Aerobic system', ['Quads', 'Glutes'], ['cardio', 'gym'], 'intermediate', 'low', ['Knee'], ['endurance', 'fat-loss'], 'Alternate harder efforts with easy spinning. Adjust resistance rather than standing and grinding.'),

  // --------------------------------------------------------------- mobility
  ex('mob-hip-flexor', 'Half-kneeling hip flexor stretch', 'mobility', 'mobility', 'Hip flexors', ['Quads'], ['mat', 'bodyweight'], 'beginner', 'low', [], ['health', 'longevity'], 'In a half-kneeling position, tuck your pelvis and shift gently forward until you feel a stretch at the front of the hip.'),
  ex('mob-90-90', '90/90 hip switch', 'mobility', 'mobility', 'Hips', ['Glutes'], ['mat'], 'beginner', 'low', ['Knee'], ['health', 'longevity'], 'Sit with both knees bent at 90 degrees and rotate slowly between sides. Keep the movement pain-free.'),
  ex('mob-cat-cow', 'Cat-cow', 'mobility', 'mobility', 'Spine', ['Core'], ['mat'], 'beginner', 'low', [], ['health', 'longevity'], 'On all fours, alternate rounding and gently extending your spine with your breath.'),
  ex('mob-thoracic', 'Thoracic rotation', 'mobility', 'mobility', 'Upper back', ['Shoulders'], ['mat'], 'beginner', 'low', [], ['health', 'longevity'], 'From all fours, place one hand behind your head and rotate your elbow toward the ceiling, then back down.'),
  ex('mob-worlds-greatest', "World's greatest stretch", 'mobility', 'mobility', 'Hips', ['Hamstrings', 'Thoracic'], ['mat', 'bodyweight'], 'intermediate', 'low', ['Knee'], ['health', 'longevity'], 'Step into a deep lunge, place both hands inside the front foot and rotate one arm open. Move slowly.'),
  ex('mob-ankle-rock', 'Ankle dorsiflexion rock', 'mobility', 'mobility', 'Ankles', ['Calves'], ['bodyweight'], 'beginner', 'low', ['Ankle'], ['health', 'longevity'], 'Keep your heel down and drive your knee gently forward over your toes. Use a wall for support.'),
  ex('mob-shoulder-dislocate', 'Band shoulder pass-through', 'mobility', 'mobility', 'Shoulders', ['Chest'], ['bands'], 'beginner', 'low', ['Shoulder'], ['health', 'longevity'], 'Hold a light band wide and pass it slowly overhead and behind you. Keep the range comfortable.'),
  ex('mob-downward-dog', 'Downward dog', 'mobility', 'mobility', 'Hamstrings', ['Shoulders', 'Calves'], ['mat'], 'beginner', 'low', ['Shoulder', 'Ankle'], ['health', 'longevity'], 'From all fours, lift your hips and lengthen your spine. Bend your knees as needed to keep your back long.'),
  ex('mob-childs-pose', "Child's pose", 'mobility', 'mobility', 'Lower back', ['Hips'], ['mat'], 'beginner', 'low', ['Knee'], ['health', 'longevity'], 'Kneel, sit back toward your heels and reach your arms forward. Breathe slowly and relax your shoulders.'),
  ex('mob-cobra', 'Cobra', 'mobility', 'mobility', 'Spine', ['Chest'], ['mat'], 'beginner', 'low', ['Back'], ['health', 'longevity'], 'Lie face down and gently press your chest up with your forearms. Keep the movement small and pain-free.'),
  ex('mob-hamstring', 'Supine hamstring stretch', 'mobility', 'mobility', 'Hamstrings', ['Calves'], ['mat'], 'beginner', 'low', [], ['health', 'longevity'], 'Lie on your back, loop a band or towel around one foot and straighten the leg to a comfortable stretch.'),
  ex('mob-calf', 'Standing calf stretch', 'mobility', 'mobility', 'Calves', ['Ankles'], ['bodyweight'], 'beginner', 'low', ['Ankle'], ['health', 'longevity'], 'Place your hands on a wall and step one foot back, keeping the heel down. Lean forward gently.'),

  // ------------------------------------------------------------- plyometric
  ex('plyo-box-jump', 'Box jump', 'conditioning', 'plyometric', 'Quads', ['Glutes', 'Calves'], ['gym'], 'advanced', 'high', ['Knee', 'Ankle', 'Back'], ['strength', 'fat-loss'], 'Jump onto a stable box you can land on softly. Step down between reps; do not rebound off the floor.'),
  ex('plyo-broad-jump', 'Broad jump', 'conditioning', 'plyometric', 'Glutes', ['Quads', 'Calves'], ['bodyweight'], 'advanced', 'high', ['Knee', 'Ankle', 'Back'], ['strength', 'fat-loss'], 'Swing your arms and jump forward, landing softly with bent knees. Reset fully between repetitions.'),
  ex('plyo-med-ball-slam', 'Medicine ball slam', 'conditioning', 'plyometric', 'Core', ['Shoulders', 'Back'], ['gym'], 'intermediate', 'moderate', ['Shoulder', 'Back'], ['fat-loss', 'endurance'], 'Raise the ball overhead and slam it down with control. Use a soft ball and keep your feet clear.'),
  ex('plyo-jump-rope', 'Jump rope', 'conditioning', 'plyometric', 'Calves', ['Shoulders', 'Core'], ['bodyweight'], 'intermediate', 'high', ['Knee', 'Ankle'], ['fat-loss', 'endurance'], 'Land softly on the balls of your feet and keep the rope turning from your wrists.'),
  ex('plyo-burpee', 'Burpee', 'conditioning', 'plyometric', 'Full body', ['Chest', 'Quads'], ['bodyweight'], 'intermediate', 'high', ['Knee', 'Ankle', 'Shoulder', 'Back'], ['fat-loss', 'endurance'], 'Step or hop back into a plank, return and stand. Use the step-back version if impact is uncomfortable.'),
  ex('plyo-skater', 'Skater hop', 'conditioning', 'plyometric', 'Glutes', ['Quads', 'Calves'], ['bodyweight'], 'intermediate', 'high', ['Knee', 'Ankle'], ['fat-loss', 'endurance'], 'Hop side to side with a soft landing. Keep the hops small enough to stay controlled.'),

  // ------------------------------------------------------------ conditioning
  ex('cond-db-thruster', 'Dumbbell thruster', 'conditioning', 'conditioning', 'Full body', ['Quads', 'Shoulders'], ['dumbbells'], 'intermediate', 'moderate', ['Knee', 'Shoulder', 'Back'], ['fat-loss', 'endurance'], 'Front squat into an overhead press in one smooth sequence. Use a load you can move safely for the whole set.'),
  ex('cond-kb-clean-press', 'Kettlebell clean & press', 'conditioning', 'conditioning', 'Full body', ['Shoulders', 'Core'], ['gym'], 'advanced', 'moderate', ['Shoulder', 'Back'], ['strength', 'fat-loss'], 'Clean the bell to the rack position, then press overhead. Keep the wrist neutral and ribs down.'),
  ex('cond-sled-push', 'Sled push', 'conditioning', 'conditioning', 'Legs', ['Glutes', 'Core'], ['gym'], 'intermediate', 'low', ['Knee', 'Back'], ['strength', 'fat-loss'], 'Push with a strong forward lean and short steps. Use a load that allows steady movement.'),
  ex('cond-battle-ropes', 'Battle ropes', 'conditioning', 'conditioning', 'Shoulders', ['Core', 'Back'], ['gym'], 'intermediate', 'low', ['Shoulder', 'Back'], ['fat-loss', 'endurance'], 'Make alternating waves with a braced trunk and soft knees. Keep the effort repeatable.'),
  ex('cond-mountain-climber', 'Mountain climber', 'conditioning', 'conditioning', 'Core', ['Shoulders', 'Quads'], ['bodyweight', 'mat'], 'beginner', 'moderate', ['Shoulder', 'Knee'], ['fat-loss', 'endurance'], 'From a plank, drive one knee toward your chest and alternate. Keep your hips from bouncing.'),
  ex('cond-high-knees', 'High knees', 'conditioning', 'conditioning', 'Quads', ['Calves', 'Core'], ['bodyweight'], 'beginner', 'high', ['Knee', 'Ankle'], ['fat-loss', 'endurance'], 'Run in place driving your knees up. Land softly and keep a tall posture.'),
  ex('cond-step-mill', 'Step mill intervals', 'conditioning', 'conditioning', 'Legs', ['Glutes', 'Calves'], ['cardio', 'gym'], 'beginner', 'moderate', ['Knee', 'Ankle'], ['endurance', 'health'], 'Climb at a steady pace without leaning heavily on the rails. Reduce speed if you need to grip.'),
]

export const EXERCISE_MAP: Record<string, ExerciseTemplate> = Object.fromEntries(
  EXERCISE_LIBRARY.map((exercise) => [exercise.id, exercise]),
)
