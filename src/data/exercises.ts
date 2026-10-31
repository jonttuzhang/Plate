// Built-in exercise library. The ids are FIXED FOREVER: sets on every device and in Supabase
// reference them. Never change or reuse an id; add new exercises with new ids at the end.
// English names follow Hevy/Strong naming so CSV imports match; `aliases` catch common variants.

export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full';

export type BuiltinExercise = {
  id: string;
  key: string;
  name: { en: string; fi: string };
  muscle: MuscleGroup;
  equipment: string;
  repMin: number;
  repMax: number;
  aliases: string[];
};

export const builtinExercises: BuiltinExercise[] = [
  { id: '3cabe1ba-1a98-4674-81eb-e7362463ca93', key: 'bench_press', name: { en: 'Bench Press (Barbell)', fi: 'Penkkipunnerrus (tanko)' }, muscle: 'chest', equipment: 'barbell', repMin: 5, repMax: 8, aliases: ['bench press', 'flat bench press'] },
  { id: '3adaceb7-f919-43d5-b3d0-37951af9e09c', key: 'incline_bench_press', name: { en: 'Incline Bench Press (Barbell)', fi: 'Vinopenkkipunnerrus (tanko)' }, muscle: 'chest', equipment: 'barbell', repMin: 6, repMax: 10, aliases: [] },
  { id: 'dcf1dcf4-107b-49b1-afcc-079963a89030', key: 'bench_press_db', name: { en: 'Bench Press (Dumbbell)', fi: 'Penkkipunnerrus (käsipainot)' }, muscle: 'chest', equipment: 'dumbbell', repMin: 8, repMax: 12, aliases: ['dumbbell bench press'] },
  { id: 'a17d8e52-7d96-4d3e-a8d8-5e0a8b1ce527', key: 'incline_bench_press_db', name: { en: 'Incline Bench Press (Dumbbell)', fi: 'Vinopenkkipunnerrus (käsipainot)' }, muscle: 'chest', equipment: 'dumbbell', repMin: 8, repMax: 12, aliases: ['incline dumbbell press'] },
  { id: 'b762db06-d86c-4244-b0dc-39a6416aa6f8', key: 'chest_fly_db', name: { en: 'Chest Fly (Dumbbell)', fi: 'Rintalentäjä (käsipainot)' }, muscle: 'chest', equipment: 'dumbbell', repMin: 10, repMax: 15, aliases: ['dumbbell fly'] },
  { id: 'f0655b7f-3d5c-4fd0-a013-b7feb7d3c425', key: 'cable_fly', name: { en: 'Cable Fly Crossovers', fi: 'Ristikkäistalja' }, muscle: 'chest', equipment: 'cable', repMin: 10, repMax: 15, aliases: ['cable crossover', 'cable fly'] },
  { id: '5cbb5509-ae39-4bfb-817b-55b94d4dc9c8', key: 'chest_press_machine', name: { en: 'Chest Press (Machine)', fi: 'Rintaprässi (laite)' }, muscle: 'chest', equipment: 'machine', repMin: 8, repMax: 12, aliases: [] },
  { id: 'bb810caf-57a4-43d9-ab7f-0a521ed21a71', key: 'chest_dip', name: { en: 'Chest Dip', fi: 'Dippi' }, muscle: 'chest', equipment: 'bodyweight', repMin: 6, repMax: 12, aliases: ['dips', 'dip'] },
  { id: '99653a2f-46b8-4a3f-9207-82ad1a57aee4', key: 'push_up', name: { en: 'Push Up', fi: 'Punnerrus' }, muscle: 'chest', equipment: 'bodyweight', repMin: 10, repMax: 20, aliases: ['push-up', 'pushup'] },
  { id: '18cb1010-2a2d-4049-80e7-3903c9a948bf', key: 'deadlift', name: { en: 'Deadlift (Barbell)', fi: 'Maastaveto (tanko)' }, muscle: 'back', equipment: 'barbell', repMin: 3, repMax: 6, aliases: ['deadlift', 'conventional deadlift'] },
  { id: '94b905ee-6bac-45b1-b29c-8d6ea9d93ebc', key: 'romanian_deadlift', name: { en: 'Romanian Deadlift (Barbell)', fi: 'Romanialainen maastaveto (tanko)' }, muscle: 'legs', equipment: 'barbell', repMin: 6, repMax: 10, aliases: ['rdl', 'romanian deadlift'] },
  { id: '46fe133c-6585-4032-a9bf-ca3c4111447e', key: 'pull_up', name: { en: 'Pull Up', fi: 'Leuanveto' }, muscle: 'back', equipment: 'bodyweight', repMin: 5, repMax: 10, aliases: ['pull-up', 'pullup'] },
  { id: '55aa371d-545c-453a-9e2a-a4ef6b8b326f', key: 'chin_up', name: { en: 'Chin Up', fi: 'Leuanveto vastaotteella' }, muscle: 'back', equipment: 'bodyweight', repMin: 5, repMax: 10, aliases: ['chin-up', 'chinup'] },
  { id: '2da70dc2-0ba9-4543-b536-5030e72b7a9a', key: 'lat_pulldown', name: { en: 'Lat Pulldown (Cable)', fi: 'Ylätalja' }, muscle: 'back', equipment: 'cable', repMin: 8, repMax: 12, aliases: ['lat pulldown', 'lat pulldown wide grip'] },
  { id: '5a77a2fe-4f3f-42cb-a00c-fa302e70964b', key: 'seated_row', name: { en: 'Seated Cable Row (Cable)', fi: 'Alatalja' }, muscle: 'back', equipment: 'cable', repMin: 8, repMax: 12, aliases: ['seated row', 'seated cable row', 'seated row cable', 'seated cable row v grip'] },
  { id: '0367b7f8-2d71-4b92-838d-35785255ea43', key: 'bent_over_row', name: { en: 'Bent Over Row (Barbell)', fi: 'Kulmasoutu (tanko)' }, muscle: 'back', equipment: 'barbell', repMin: 6, repMax: 10, aliases: ['barbell row', 'bent over row'] },
  { id: '611ccc75-cd3b-46ba-9f26-68807b016af3', key: 'dumbbell_row', name: { en: 'Dumbbell Row', fi: 'Yhden käden soutu' }, muscle: 'back', equipment: 'dumbbell', repMin: 8, repMax: 12, aliases: ['one arm dumbbell row', 'single arm dumbbell row', 'dumbbell row (dumbbell)'] },
  { id: '9bd41d6d-4398-4458-830b-de93e94b35f6', key: 't_bar_row', name: { en: 'T Bar Row', fi: 'T-soutu' }, muscle: 'back', equipment: 'machine', repMin: 8, repMax: 12, aliases: ['t-bar row'] },
  { id: '3165c753-efe9-4b4e-95f2-c27c1dee1b5e', key: 'face_pull', name: { en: 'Face Pull (Cable)', fi: 'Face pull (talja)' }, muscle: 'shoulders', equipment: 'cable', repMin: 12, repMax: 15, aliases: ['face pull'] },
  { id: 'fdc732fb-6524-447f-83a9-ceafa5619ebb', key: 'shrug_db', name: { en: 'Shrug (Dumbbell)', fi: 'Olankohautus (käsipainot)' }, muscle: 'back', equipment: 'dumbbell', repMin: 10, repMax: 15, aliases: ['dumbbell shrug'] },
  { id: '46cf12cd-4f7c-436e-987d-9e73643bd957', key: 'back_extension', name: { en: 'Back Extension', fi: 'Selänojennus' }, muscle: 'back', equipment: 'bodyweight', repMin: 10, repMax: 15, aliases: ['hyperextension'] },
  { id: 'a018ddb4-ec4e-4708-8847-e71962f9d555', key: 'squat', name: { en: 'Squat (Barbell)', fi: 'Takakyykky (tanko)' }, muscle: 'legs', equipment: 'barbell', repMin: 5, repMax: 8, aliases: ['back squat', 'squat', 'barbell squat'] },
  { id: 'ccbd5d20-0430-45b8-a74b-9f5a93689b64', key: 'front_squat', name: { en: 'Front Squat (Barbell)', fi: 'Etukyykky (tanko)' }, muscle: 'legs', equipment: 'barbell', repMin: 5, repMax: 8, aliases: ['front squat'] },
  { id: 'e2eeff69-e886-4094-926f-0fe3144b2dc1', key: 'leg_press', name: { en: 'Leg Press (Machine)', fi: 'Jalkaprässi' }, muscle: 'legs', equipment: 'machine', repMin: 8, repMax: 12, aliases: ['leg press'] },
  { id: 'f8cea68e-849c-4a46-84ac-4e16341ebf48', key: 'hack_squat', name: { en: 'Hack Squat (Machine)', fi: 'Hack-kyykky' }, muscle: 'legs', equipment: 'machine', repMin: 8, repMax: 12, aliases: ['hack squat'] },
  { id: '92824711-f028-4e5e-82b8-f366267a1321', key: 'bulgarian_split_squat', name: { en: 'Bulgarian Split Squat', fi: 'Bulgarialainen askelkyykky' }, muscle: 'legs', equipment: 'dumbbell', repMin: 8, repMax: 12, aliases: ['split squat'] },
  { id: '7ec73a85-11ac-4c72-97d3-ad6c62aafe5f', key: 'lunge_db', name: { en: 'Lunge (Dumbbell)', fi: 'Askelkyykky (käsipainot)' }, muscle: 'legs', equipment: 'dumbbell', repMin: 8, repMax: 12, aliases: ['dumbbell lunge', 'walking lunge (dumbbell)', 'lunge'] },
  { id: '26cd5c92-0a7a-4d0c-836a-30b4379dc0de', key: 'goblet_squat', name: { en: 'Goblet Squat', fi: 'Goblet-kyykky' }, muscle: 'legs', equipment: 'dumbbell', repMin: 8, repMax: 12, aliases: [] },
  { id: '80260211-645e-4ee9-896d-6e913cb89eba', key: 'leg_extension', name: { en: 'Leg Extension (Machine)', fi: 'Reiden ojennus (laite)' }, muscle: 'legs', equipment: 'machine', repMin: 10, repMax: 15, aliases: ['leg extension'] },
  { id: 'ca15e0b4-6a9f-4557-9fb4-6494ee28aa69', key: 'lying_leg_curl', name: { en: 'Lying Leg Curl (Machine)', fi: 'Reiden koukistus maaten (laite)' }, muscle: 'legs', equipment: 'machine', repMin: 10, repMax: 15, aliases: ['lying leg curl', 'leg curl'] },
  { id: 'e88059f6-2862-41cd-9ace-34ebf64b6a44', key: 'seated_leg_curl', name: { en: 'Seated Leg Curl (Machine)', fi: 'Reiden koukistus istuen (laite)' }, muscle: 'legs', equipment: 'machine', repMin: 10, repMax: 15, aliases: ['seated leg curl'] },
  { id: 'dc3f632d-1963-49aa-ab6c-3effe7b9983d', key: 'hip_thrust', name: { en: 'Hip Thrust (Barbell)', fi: 'Lantionnosto (tanko)' }, muscle: 'legs', equipment: 'barbell', repMin: 8, repMax: 12, aliases: ['hip thrust', 'barbell hip thrust'] },
  { id: '561e807d-fb15-4866-b265-4455e22bdf00', key: 'standing_calf_raise', name: { en: 'Standing Calf Raise (Machine)', fi: 'Pohjenousu seisten' }, muscle: 'legs', equipment: 'machine', repMin: 10, repMax: 15, aliases: ['calf raise', 'standing calf raise'] },
  { id: '35e83bce-f21e-4612-a9b9-69dc4ff31054', key: 'seated_calf_raise', name: { en: 'Seated Calf Raise (Machine)', fi: 'Pohjenousu istuen' }, muscle: 'legs', equipment: 'machine', repMin: 12, repMax: 20, aliases: ['seated calf raise'] },
  { id: '2599f8a6-7530-49e1-8dc2-689fa036d98e', key: 'overhead_press', name: { en: 'Overhead Press (Barbell)', fi: 'Pystypunnerrus (tanko)' }, muscle: 'shoulders', equipment: 'barbell', repMin: 5, repMax: 8, aliases: ['ohp', 'overhead press', 'military press', 'strict military press (barbell)'] },
  { id: 'a4939016-e2e5-4048-a87a-1d578d0d8f81', key: 'shoulder_press_db', name: { en: 'Shoulder Press (Dumbbell)', fi: 'Pystypunnerrus (käsipainot)' }, muscle: 'shoulders', equipment: 'dumbbell', repMin: 8, repMax: 12, aliases: ['seated dumbbell shoulder press', 'dumbbell shoulder press', 'seated overhead press (dumbbell)'] },
  { id: '0be340df-7600-4281-b887-bb6f088d8f4b', key: 'shoulder_press_machine', name: { en: 'Shoulder Press (Machine)', fi: 'Pystypunnerrus (laite)' }, muscle: 'shoulders', equipment: 'machine', repMin: 8, repMax: 12, aliases: [] },
  { id: 'd0ecba1a-facf-44f3-8312-25d897436070', key: 'lateral_raise_db', name: { en: 'Lateral Raise (Dumbbell)', fi: 'Vipunosto sivulle (käsipainot)' }, muscle: 'shoulders', equipment: 'dumbbell', repMin: 12, repMax: 15, aliases: ['lateral raise', 'side lateral raise'] },
  { id: '770db952-0894-4691-bd23-87daf002f3a1', key: 'lateral_raise_cable', name: { en: 'Lateral Raise (Cable)', fi: 'Vipunosto sivulle (talja)' }, muscle: 'shoulders', equipment: 'cable', repMin: 12, repMax: 15, aliases: ['cable lateral raise'] },
  { id: '19cb127d-026e-43d2-b6f6-54cd920b1099', key: 'rear_delt_fly', name: { en: 'Rear Delt Reverse Fly (Dumbbell)', fi: 'Takaolkapäiden vipunosto' }, muscle: 'shoulders', equipment: 'dumbbell', repMin: 12, repMax: 15, aliases: ['reverse fly', 'rear delt fly', 'reverse fly (dumbbell)'] },
  { id: '90adfd21-38fc-47e0-a1ff-cdcaabf51c15', key: 'upright_row', name: { en: 'Upright Row (Barbell)', fi: 'Pystysoutu (tanko)' }, muscle: 'shoulders', equipment: 'barbell', repMin: 10, repMax: 12, aliases: ['upright row'] },
  { id: 'e820f421-7839-455d-8ae4-3887f4e62853', key: 'bicep_curl_barbell', name: { en: 'Bicep Curl (Barbell)', fi: 'Hauiskääntö (tanko)' }, muscle: 'arms', equipment: 'barbell', repMin: 8, repMax: 12, aliases: ['barbell curl', 'biceps curl (barbell)'] },
  { id: '0c27dca8-d2fc-4a1d-868b-426742391327', key: 'bicep_curl_db', name: { en: 'Bicep Curl (Dumbbell)', fi: 'Hauiskääntö (käsipainot)' }, muscle: 'arms', equipment: 'dumbbell', repMin: 10, repMax: 12, aliases: ['dumbbell curl', 'biceps curl (dumbbell)', 'bicep curl'] },
  { id: '0a9dcb83-7eb4-4cc0-88c1-05b397c8fce4', key: 'hammer_curl', name: { en: 'Hammer Curl (Dumbbell)', fi: 'Vasarakääntö (käsipainot)' }, muscle: 'arms', equipment: 'dumbbell', repMin: 10, repMax: 12, aliases: ['hammer curl'] },
  { id: '76d5a6d0-f7f7-4a28-a358-27134988af08', key: 'preacher_curl', name: { en: 'Preacher Curl (Barbell)', fi: 'Scott-kääntö' }, muscle: 'arms', equipment: 'barbell', repMin: 10, repMax: 12, aliases: ['preacher curl', 'preacher curl (machine)'] },
  { id: '75686cf8-60e5-4c8e-85c0-d5978f57be2e', key: 'cable_curl', name: { en: 'Bicep Curl (Cable)', fi: 'Hauiskääntö (talja)' }, muscle: 'arms', equipment: 'cable', repMin: 10, repMax: 15, aliases: ['cable curl'] },
  { id: '814f3f9c-1404-4f03-92a1-8df7d11a5c44', key: 'triceps_pushdown', name: { en: 'Triceps Pushdown', fi: 'Ojentajapunnerrus talja' }, muscle: 'arms', equipment: 'cable', repMin: 10, repMax: 15, aliases: ['tricep pushdown', 'triceps pushdown (cable - straight bar)', 'triceps rope pushdown', 'pushdown'] },
  { id: 'd2e2122b-ea8d-42ad-8a51-8308cd520848', key: 'overhead_triceps_ext', name: { en: 'Overhead Triceps Extension (Cable)', fi: 'Ojentajan ojennus pään yli (talja)' }, muscle: 'arms', equipment: 'cable', repMin: 10, repMax: 15, aliases: ['overhead tricep extension', 'triceps extension (cable)'] },
  { id: 'c3951af9-1149-44a1-9140-8b46d293f68c', key: 'skull_crusher', name: { en: 'Skullcrusher (Barbell)', fi: 'Ranskalainen punnerrus (tanko)' }, muscle: 'arms', equipment: 'barbell', repMin: 8, repMax: 12, aliases: ['skull crusher', 'lying triceps extension (barbell)'] },
  { id: '283529fc-45dd-4604-a1ea-5ac2b289fd84', key: 'close_grip_bench', name: { en: 'Close Grip Bench Press', fi: 'Kapea penkkipunnerrus' }, muscle: 'arms', equipment: 'barbell', repMin: 6, repMax: 10, aliases: ['close grip bench press (barbell)'] },
  { id: 'd5495cdd-4e57-4c10-b20d-fe9c9a4fe643', key: 'cable_crunch', name: { en: 'Cable Crunch', fi: 'Vatsarutistus talja' }, muscle: 'core', equipment: 'cable', repMin: 10, repMax: 15, aliases: [] },
  { id: 'b1823616-45b6-4c5a-9aa8-6de0bf21b7e5', key: 'hanging_leg_raise', name: { en: 'Hanging Leg Raise', fi: 'Riippuva jalannosto' }, muscle: 'core', equipment: 'bodyweight', repMin: 8, repMax: 15, aliases: ['leg raise'] },
  { id: '1191360d-9e1e-4ce6-962f-a6cd62490e34', key: 'ab_wheel', name: { en: 'Ab Wheel', fi: 'Vatsarulla' }, muscle: 'core', equipment: 'bodyweight', repMin: 8, repMax: 15, aliases: ['ab rollout'] },
  { id: '118b41b9-8481-4b99-aa1c-e58d7eb785a8', key: 'crunch', name: { en: 'Crunch', fi: 'Vatsarutistus' }, muscle: 'core', equipment: 'bodyweight', repMin: 12, repMax: 20, aliases: ['crunches'] },
  { id: '27dab129-890b-4001-af1b-6eb9317b12b2', key: 'kettlebell_swing', name: { en: 'Kettlebell Swing', fi: 'Kahvakuulaheilautus' }, muscle: 'full', equipment: 'kettlebell', repMin: 12, repMax: 20, aliases: [] },
  { id: '666c8980-3f5c-4c30-8add-08106e4f3969', key: 'power_clean', name: { en: 'Power Clean', fi: 'Rinnalleveto' }, muscle: 'full', equipment: 'barbell', repMin: 3, repMax: 5, aliases: ['clean'] },
  { id: 'bfea4848-8f2a-4127-ac02-885de1401d24', key: 'sumo_deadlift', name: { en: 'Sumo Deadlift (Barbell)', fi: 'Sumomaastaveto (tanko)' }, muscle: 'back', equipment: 'barbell', repMin: 3, repMax: 6, aliases: ['sumo deadlift'] },
  { id: '014a87bd-eae2-463a-9c66-26c97541b54c', key: 'trap_bar_deadlift', name: { en: 'Trap Bar Deadlift', fi: 'Maastaveto trap-tangolla' }, muscle: 'back', equipment: 'trap_bar', repMin: 3, repMax: 6, aliases: ['hex bar deadlift'] },
  { id: '51528091-ce61-4493-8c4c-671c8a9bc763', key: 'pec_deck', name: { en: 'Pec Deck (Machine)', fi: 'Rintalentäjä (laite)' }, muscle: 'chest', equipment: 'machine', repMin: 10, repMax: 15, aliases: ['butterfly', 'pec deck'] },
  { id: 'd48016b3-7695-449a-8f3e-58ad94ce0b0a', key: 'reverse_pec_deck', name: { en: 'Rear Delt Fly (Machine)', fi: 'Takaolkapäät (laite)' }, muscle: 'shoulders', equipment: 'machine', repMin: 12, repMax: 15, aliases: ['reverse pec deck'] },
];
