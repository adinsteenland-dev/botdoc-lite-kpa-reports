/**
 * Seed group partner cards into the local Postgres DB.
 * Idempotent — skips any group whose name already exists.
 *
 * Run: node scripts/seed-groups.mjs
 */
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const [key, ...rest] = line.trim().split('=');
  if (key && !key.startsWith('#') && rest.length) process.env[key] = rest.join('=');
}

const sql = postgres(process.env.DATABASE_URL);

// Each group: { name, storeIds }
// storeIds are Fabric apikey UUIDs. The fetchMetrics dedup logic handles any
// duplicate UUIDs for the same store name — it keeps the one with most sessions.
const GROUPS = [
  {
    name: 'Advantage Dealer Group',
    storeIds: [
      'f7b3d6d325c748298256592f1c199567', // advantage_buick_gmc_cadillac
      '25a1e6e9d76a45fc9f8111a40fe146de', // advantage_acura_of_naperville
      'd9fc0588630342d3bf79386ec59c3257', // advantage_chevrolet_bridgeview
      'b2688dc5e1cc494f9c4408468958f924', // advantage_chevrolet_of_bolingbrook
      'bda816dd84a24638833ef4acf597116c', // advantage_chevrolet_of_hodgkins
      '77f76c17e7ce4e588410b5584e00fcaf', // advantage_toyota_of_river_oaks
    ],
  },
  {
    name: 'Baxter',
    storeIds: [
      // Branded "baxter" stores
      'd1a8b90ee8c44d00951ae17754e7dfe2', 'd80bfebbdf5c4e3e8e23458032e1fae0', // baxter_subaru_la_vista
      'af6d017494464af98f035be3702f4243',                                       // baxter_audi_omaha (kpa42699)
      '170178f76d774bcfa9558ffd6cd038b5', '8ab67d9021b6411694c8d4f74cb9decd', // baxter_ford_of_omaha_elkhorn (kpa42699)
      '0122a97a9bef4f3c93e0beb8729b3751',                                       // baxter_ford_of_omaha_omaha (ne00113)
      '694d220f85ca4b7aa5d8bed88dc4ad2d', '09b321fddb3b4665b7c0e54de1a79e07', // baxter_vw_la_vista
      'a51ee93d5e704aef8542d7fa680d82db', 'af8c14b54bce47aca5bfed23ffe09943',
      'c1c7f63c4fa44bfd8e77a5bc4ae5b519', 'e062ec7fc5e44a14b73d261844818650', // baxter_toyota_la_vista (x4)
      '058b3b7aec214c6d8db291de4160da95', '41812f4062764ae685c653d915c0f36d', // baxter_toyota_lincoln
      '18ed51b2782749f29277e1a425d8b991', '66e3e2cdbdc74f8ea365f2026e07ae03', // baxter_ford_south
      '586149a4f37344279524229661822ae7', 'e94a2757c1c6429c96e40bb62ef6ce60', // baxter_subaru_omaha
      '6772e46f2627491e86ea6dd2ec9babc1', '27d6b713a2cc430d8d4a31aca93abaf4', // baxter_vw_omaha
      // Other Baxter-owned stores (different brand names)
      'd0772db155f84a6fb6a7d4b2869ae59b', '4b8bb4255de848d0b096339813ae6ced', 'cd4afefbdc29431c9f55bd00289f1bc3', // audi_omaha (kpa141816)
      '190a48b90fbc4a18ae9fbbd8a12df740', '6c620c95d7174411933bbcbc9ad08c27', 'c824d1ab883443898a8e6ecd069d2f3d', // honda_of_olathe
      '94fd965489d54d108640df4c4efce8e8', '0bceec3d6050416f841d7d72cd3811cf', 'cfa50f456ab04d82bd5883ae850c99ed', // audi_shawnee_mission
      '021644b9f0424781855909754aedc3c6', '975917a2777e4e06a77eb5fb843f8afe', // subaru_of_olathe
      '4647981ca89a4822975ade1b3ac46ca1', '099363e8d3bc49968301cc70b41d94e9', // legends_toyota
      '5897540507a54c2c84af6b7de4004d11', '56010531577c45e0bafe5b0fb0b51617', // legends_honda
      'e6b8422f32884ef69a05a0572818bf4f', '82f5066be27c4fe492178ae5a6530550', // lexus_of_omaha
      '35f8b29e151f416a9e520f69b64e0a06', '1f867727a0d24d0ba279134dc1454912', // lexus_of_lincoln
      'b29fea8cb5584d94af3bb8a60fe8ab0a', 'fc67641900f84edd9217d43f90c1efc2', // mercedes_benz_of_omaha
      '3cbdd520a27945bb939e13d7a9aac87e', '18e2ed91785246749643b84bfb705d29', // lexus_of_colorado_springs
      '38e31b33bdf44cd682e1afe3c342f940', 'e4196ee1b98b4ae4a4016c7381e5db11', // toyota_of_colorado_springs
      '237c00b33b3448b0857dbcac55857fb7', '82b0100bd72641f0812df4f4e20d1edc', // smart_motors_toyota
    ],
  },
  {
    name: 'Bravo Automotive Group',
    storeIds: [
      'c66f04c52bf24fa2883d497eb3460db1', // bravo_cadillac_el_paso
      '3bd58a4a7c5b47f49fb062cd2a85ce8d', // bravo_nissan_victoria
      '6a9beec2e6c043cb95f727e6681d0ea9', // bravo_honda_victoria
      'ca7d265b3812464eaf5452c7cabd7130', // bravo_chevrolet_cadillac_el_paso
      '7b64338bf16e4252a2e016c62b79a267', // bravo_nissan_of_baytown
    ],
  },
  {
    name: 'Bryson Morgan Group',
    storeIds: [
      'f6349536446943cc93c81c0a01e339f8', // battleground_kia
      '59e0081a650d4a8485ccf3a9d965e158', // burlington_kia
      '172b484399f94fa89ab64ca95b71b56e', // ml_motors
    ],
  },
  {
    name: 'Competition Auto Group',
    storeIds: [
      '1bde6135f8cc4cf89eb413c7ce2c3413', // comp0000_competition_auto_group
      '7dc121f547f8450caf5586c469a81921', // comp0000_competition_auto (dup entry)
      '15c45e18b2f0430f9e8cf6a00db558b5', // competition_bmw_of_smithtown
      '66cf5c8adaf34a1b8264f65d276e238d', // mercedes_benz_of_huntington
      '5a47d439a2bb40eba48d06f539df0e21', // competition_subaru
      'eb0da8c429024454b2af5ec5f430df84', // genesis_of_smithtown
      '202ebafb0e4e4f0ba19cce75fcfdced9', // mercedes_benz_of_smithtown
    ],
  },
  {
    name: 'Crain Automotive',
    storeIds: [
      '0b16cc0f34164d439fbde3724a47a457', // crain_vw_fayetteville
      'd714917219344fa38178976175d602b5', // crain_kia_sherwood
      '3dbffc75c2314136a64c466abdcea7ab', // crain_kia_fort_smith
      '30077812ac574112bb7d8a7fdcc0f957', // crain_kia_fayetteville
      'a311b24012d745eea377e5b0a245441e', // crain_kia_conway
      '7c90c50853b64c79bfef964b4b072185', // crain_kia_bentonville
      'c02c2a93183f4b1896b3cf237309a758', // crain_hyundai_north_little_rock
      'ee4b0261807647e990fb5aa78bb2d43c', // crain_hyundai_little_rock
      '07cd9c72683e4850a3f41ef6d00c7f1b', // crain_hyundai_fort_smith
      '58ffaecbd2a742a5a853adb11fbde4eb', // crain_hyundai_fayetteville
      '159d6e0cbed349bfbb9200d9098b34fa', // crain_hyundai_bentonville
      'b44b0349f0b3487488fbbea624b8a23a', // crain_ford_little_rock
      '9f0a7979ca5e431181243cdeb0b7497e', // crain_ford_jacksonville
      'd58bf3210138445da1adf8b9b49338c1', // crain_chevrolet_little_rock
      'f6ee926044c74054affbf341543e3dfe', // crain_buick_gmc_springdale
      'd98742c919fb4069ac53ef4bad1054ed', // crain_buick_gmc_conway
      '33be6e03d29a4b00bf57cc2fc1c4fc34', // crain_automotive_team
    ],
  },
  {
    name: 'Gateway Motors',
    storeIds: [
      '9adbd665ee2a420091b9ba8b97e1a00f', // gateway_kia_warrington
      '834361966c3349539e042815cbea89f9', // gateway_kia_quakertown
      'c79d890a016e4ec383e9be8eb77903f2', // gateway_kia_north_brunswick
    ],
  },
  {
    name: 'Greenway Auto Group',
    storeIds: [
      'a201848a3ebf44beaca1889eff2fbc43', // greenway_gmc_truck
      '7c567d94706246439975f155e6a16b45', // greenway_ford_cdjr
    ],
  },
  {
    name: 'Homer Skelton Automotive',
    storeIds: [
      'edec972e02d54ed49b9e589928a2c4e7', // homer_skelton_cdj_millington
      '7e6f66e4e95c4748ab6fe124382c5828', // homer_skelton_ford_millington
      '69d01961e11c4ff89f3f533118b1cf0c', // homer_skelton_ford_olive_branch
      'af3c42951e3a425d945168ba04e261ce', // homer_skelton_hyundai_olive_branch
    ],
  },
  {
    name: 'Jake Sweeney Automotive Group',
    storeIds: [
      '3e4309b8e9184c9dbfff2f22ce368c64', // jake_sweeney_automotive_group (c0000015472)
      '0ff1270f3a9a4ab8ae571fac746769ee', // jake_sweeney_chevrolet
      '83364364db5146d288f4dff7f284b1d2', // jake_sweeney_bmw
      '6f91b35f9bbf4a949bd8dfc376393241', // jake_sweeney_body_shop
      '9f2ec20cae224214bc4270c911f085ca', // jake_sweeney_buick_gmc_cadillac
      '127df1a5140e4b43a280ae01d976f3e9', // jake_sweeney_cjdr_fiat_alfa_romeo
      '50fc246d764c41eab901eccc3ce33379', // jake_sweeney_kia
      '936efe1488874114927c8e043784d626', // jake_sweeney_mazda
      '2ed2abbfcf7d4056875968a57f85fd3d', // jake_sweeney_mazda_west
      '4dbead5987534fb38a4df50e54e133a5', // jake_sweeney_mitsubishi
    ],
  },
  {
    name: 'Jim Marsh',
    storeIds: [
      '73758252253849cc81d877cc6efcec83', // jim_marsh_kia
      'fb647579840d445ebb8fd48f04b76cc6', // jim_marsh_jeep
    ],
  },
  {
    name: 'Kent Ritchey Group',
    storeIds: [
      '9c47a5e4140c494296081bda98e51c1f', // krg0000_kent_ritchey_group
      '952df64e98fc4f88804bc70369313ed3', // landers_dodge_southaven
      'cb32a626d8354fc49c271cb06a6179d1', // landers_nissan_southaven
      '8356c37a25da461f830f7325da876d6f', // landers_buick_gmc_southaven
      'b4db7a3a51544fe1a682eabc198708ea', // ritchey_jackson_llc
      '6a2405ae2ad349cda292d6094d411ac5', // landers_ford_south
      '30de04b0714a4885b7e5e0057fa49818', // cadillac_of_memphis
      'a0e4ceb8abe6471db39d3850f632132a', // landers_ford_north
      '5e74ca122e6640a897c43045c371dcaf', // landers_chrysler_dodge_jeep_ram_north
      '44307dea4b624241943772f22d5aa09c', // landers_ford_collierville
      'cab467feaf2a4d49b9b2da60c00ec88f', // landers_ford_inc_memphis
    ],
  },
  {
    name: 'King Auto Group',
    storeIds: [
      '90282166c54f4bd6a287472bffed9d0c', // orlando_automotive_fountain_automotive
      '8eba81a550d4418d88ef6f83901a9233', // deerfield_automotive_llc
    ],
  },
  {
    name: 'Kline Automotive',
    storeIds: [
      '1c3a49fd9ce246f49a16c27e4a0ae228', // alfa_romeo_of_santa_monica
      '9908fb58fca54877b0626da0ff1f865f', // kline_volvo_cars_of_maplewood
      'aa91855a96c74d0d9069e708a99de718', // volvo_cars_of_santa_monica
      '6df5091d2ecb4067946d59c126f56886', // kline_nissan_st_paul
    ],
  },
  {
    name: 'Krumland Auto Group',
    storeIds: [
      '1391cc3b898948bc9e90cc145b1d3552', // roswell_ford
      '40bb773b2cb34ba791e28e52125b862d', // roswell_toyota
      'a4aec5d36fba418797b12e1a979bfc10', // carlsbad_chevrolet
      'abfe470301ba4ca5b096d0074d11c1cf', // roswell_honda
      'dfdb0830484543698f88cef1ffc312ff', // roswell_hyundai
      '78b07de361bf439094f8174f782358e1', // carlsbad_ford
      '19b9430889b249f49774cffdd43ecfc9', // roswell_nissan
    ],
  },
  {
    name: 'Liberty Auto Group',
    storeIds: [
      'e505b97b16f0425ca9314c7545505419', // liberty_ford_aurora
      '43de96d9bd804909a7515261a04478c6', // liberty_ford_brunswick
      '55cdb049b1d24162b05e12db89b24758', // liberty_ford_canton
      '1ce478666fdd41c79d5d2c9f853841ce', // liberty_ford_maple_heights
      '468a13859dd2454e9ae9e32ec7d8f0e6', // liberty_ford_vermilion
      '39fa833d2b8d452e86ade78fe193a354', // liberty_ford_parma_heights
    ],
  },
  {
    name: 'Long-Lewis Auto Group',
    storeIds: [
      '1e4db1c10d684e92a7121bf951e45159', // llf0000_long_lewis_ford_group (group entry)
      'f66274a244ff4367b655c3de6a36da4e', // long_lewis_auto_muscle_shoals
      'b4f7f46ac2c44e5486ca6a14f35ebfe6', // long_lewis_ford_of_florence
      'c92c7b959dfc40e19665830b630a9633', // long_lewis_river_region_ford
      'ec79213e124e420aa7f2d3abf066c175', // long_lewis_of_hoover
      '17a34e37547b4f2daa90029e745dad3e', // long_lewis_of_alabaster
      '8db8bf51837a4f45b83aba325b669105', // long_lewis_chevrolet_of_the_shoals
      '9e492b5345a740e79373af267ea516b1', // long_lewis_cullman
      'fb838e27c75541749f931bcb75dc7695', // chevrolet_bessemer (Long-Lewis)
    ],
  },
  {
    name: 'Mattioli Automotive Group',
    storeIds: [
      'c07dd2ade74e4216b40e349adc329826', // ferrari_beverly_hills
      '7091bc0df8464790b1233d9cf90cb733', // ferrari_westlake
      'c1088efd3b9a4db290ad175dc7cf18ac', // ferrari_los_angeles
      '80a97a9e33bd40f9b5216643327c0839', // rosso_racing_llc
    ],
  },
  {
    name: 'Nick Abraham Auto Mall',
    storeIds: [
      'ceb515463e4a447fbe65e12772beff90', // nick_abraham_elyria_ford
      '19509d6159e34b4e9d4fa5f8326a8a03', // nick_abraham_buick_gmc
    ],
  },
  {
    name: 'Rafih Auto Group',
    storeIds: [
      '273c2492f5f9418ab8233e99465851cb', // audi_rochesterhills
      '26c4cfbcf9d6499e81a2c212a08e79f3', // bmw_of_rochesterhills
      '3f6aadeaf70b4305a4fa4384c3861d66', '921aa63f79954288a20b75a59de40ae8', // motor_city_mini (2 UUIDs)
      '3a649198d3914ddfb51d5e1d30c15b66', // porsche_detroit_north
    ],
  },
  {
    name: 'Rick Weaver Automotive Group',
    storeIds: [
      '8f45e1cd6aa84e29a68bd52a326e0d13', // rick_weaver_buick_gmc
      '1a844c22f26146088ef85866605282ab', // rick_weaver_chevrolet
    ],
  },
  {
    name: 'RI Suresky & Sons',
    storeIds: [
      '14faab286cf3454ab3c583763d223981', // suresky_hyundai
      '1d1ff1034e354436b1fd39a952b64c21', // ri_suresky_sons_inc
    ],
  },
  {
    name: 'Swope Family of Dealerships',
    storeIds: [
      'a90a6c370bca4476b708b4544310b1d8', // bob_swope_ford
      '971b27c139e14d46890b6ef312cf8776', // swope_chrysler_dodge_jeep
      '47110849ca274938b56132a4d12b7428', // swope_hyundai
      'd0bac55a3ae3456c85d403b0afd96f54', // swope_mitsubishi
      'e34445e6bbc540bc89fd9a56fa00a627', // swope_nissan
      'f2680bbc8ee3474dab8c6b7c400d8b55', // swope_toyota
    ],
  },
  {
    name: 'Towbin Automotive Group',
    storeIds: [
      'd0a7ded7c5464b2bb14dbc8477c12e19', // towbin_kia (kpa110753 - old entry)
      'b77f0531a27b4b01b9a67fc968c5a575', // towbin_alfa_romeo (kpa142565)
      '694691c62838496689a6592a8404b588', // towbin_dodge (kpa142566)
      'e63403a7330b4c8e82ae9042af28a227', // towbin_kia (kpa142567 - new entry)
      '275d691293bc45b48708e53acd927959', // towbin_fiat_alfa_romeo (nv00136 - old)
      '029939e783ed4ccb8c8d0f4c0f452869', // towbin_dodge_ram (nv00144 - old)
    ],
  },
];

// Fetch existing partner names to skip duplicates
const existing = await sql`SELECT name FROM botdoc.partners`;
const existingNames = new Set(existing.map(r => r.name));

let inserted = 0;
let skipped = 0;

for (const group of GROUPS) {
  if (existingNames.has(group.name)) {
    console.log(`  skip  ${group.name}`);
    skipped++;
    continue;
  }
  await sql`
    INSERT INTO botdoc.partners (name, data_filter)
    VALUES (${group.name}, ${JSON.stringify({ storeIds: group.storeIds })})
  `;
  console.log(`  added ${group.name} (${group.storeIds.length} store UUIDs)`);
  inserted++;
}

console.log(`\nDone — ${inserted} added, ${skipped} skipped.`);
await sql.end();
