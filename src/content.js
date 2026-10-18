// All on-screen copy, story data and plate calibration live here.
// Edit this file to change wording, numbers, or re-anchor a new plate image.
import plateUrl from '../img/旧占位符/镜头345图片.png';
import plateVideoUrl from '../img/循环视频/FlowerMovement.mp4';
import humanVideoUrl from '../img/循环视频/HumanMovement.mp4';
import scan1 from '../img/扫描页真实图片/scan1.png';
import scan2 from '../img/扫描页真实图片/scan2.png';
import scan3 from '../img/扫描页真实图片/scan3.png';
import scan4 from '../img/扫描页真实图片/scan4.png';

export const SYSTEM = {
  name: 'NATURE RECONSTRUCTION SYSTEM',
  short: 'NRS',
  version: 'v7.2',
  node: 'VR-NODE 04',
  project: 'NSRP',
};

// Story time (in-film), not production time.
export const STORY = {
  date: '2026-10-08',
  // story clock at the first frame of each shot
  clock: ['14:12:08', '14:13:41', '14:14:02', '14:19:30', '14:26:11', '14:31:58', '14:32:14'],
};

export const SPECIES = {
  cn: '紫纹兜兰',
  sci: 'Paphiopedilum purpuratum',
  sciUpper: 'PAPHIOPEDILUM PURPURATUM',
  family: { cn: '兰科', en: 'Orchidaceae' },
  genus: { cn: '兜兰属', en: 'Paphiopedilum' },
  habit: { cn: '多年生草本', en: 'PERENNIAL HERB' },
  protection: { cn: '国家一级保护', en: 'NATIONAL CLASS I' },
  range: { cn: '中国南部 · 越南', en: 'S. CHINA · VIETNAM' },
};

export const S1 = {
  titleEn: 'NATURE RECONSTRUCTION',
  titleCn: '自然重建',
  sampleEn: 'SAMPLE 017',
  sampleCn: '样本 017 号',
  project: 'PROJECT NSRP // NATURE SAMPLE RECONSTRUCTION',
};

export const S2 = {
  en: 'RECONSTRUCTION COMPLETE',
  cn: '重构完成',
  scopeCn: '形态重构完成',
  scopeEn: 'VISIBLE MORPHOLOGY',
};

export const S3 = {
  // real scan photos for the organ-analysis window, one per stage (in stage order)
  scans: [scan1, scan2, scan3, scan4],
  stages: [
    { key: 'plant', cn: '全株识别', en: 'WHOLE-PLANT IDENTIFICATION' },
    { key: 'leaf', cn: '叶片形态', en: 'LEAF MORPHOLOGY' },
    { key: 'texture', cn: '叶片纹理', en: 'LEAF TEXTURE' },
    { key: 'flower', cn: '花朵结构', en: 'FLOWER STRUCTURE' },
  ],
  leaf: [
    { cn: '叶基生', en: 'BASAL LEAVES' },
    { cn: '狭椭圆形或长圆状椭圆形', en: 'NARROWLY ELLIPTIC TO OBLONG-ELLIPTIC' },
  ],
  texture: [
    { cn: '深浅绿色相间的网格斑纹', en: 'TESSELLATED DARK / LIGHT GREEN' },
    { cn: '叶背浅绿色', en: 'ABAXIAL SURFACE PALE GREEN' },
  ],
  flower: [
    { cn: '花单生', en: 'SOLITARY' },
    { cn: '花瓣紫红色或浅栗色', en: 'PETALS PURPLE-RED / PALE CHESTNUT' },
    { cn: '唇瓣囊状 ·「拖鞋」形态', en: 'SACCATE LIP · SLIPPER FORM' },
    { cn: '花径 7—8 厘米', en: 'FLOWER Ø 7–8 CM' },
  ],
};

export const S4 = {
  habitat: [
    { cn: '林下', en: 'FOREST UNDERSTORY' },
    { cn: '腐殖质', en: 'HUMUS LAYER' },
    { cn: '多石地面', en: 'ROCKY GROUND' },
    { cn: '岩缝', en: 'ROCK CREVICES' },
    { cn: '溪谷苔藓', en: 'MOSSY STREAM VALLEY' },
  ],
  relations: [
    { key: 'canopy', cn: '林冠遮荫', en: 'CANOPY SHADE' },
    { key: 'water', cn: '水分', en: 'MOISTURE' },
    { key: 'humus', cn: '腐殖质养分', en: 'HUMUS' },
    { key: 'moss', cn: '苔藓保湿', en: 'MOSS HUMIDITY' },
    { key: 'pollen', cn: '传粉路径', en: 'POLLINATION' },
  ],
  threats: [
    { cn: '栖息地破坏', en: 'HABITAT DESTRUCTION', sub: '生境斑块减少 · 连通断开', subEn: 'PATCH LOSS · CONNECTIVITY BREAK' },
    { cn: '生境变化影响生长', en: 'HABITAT CHANGE', sub: '水分与局部微气候改变', subEn: 'MOISTURE · MICROCLIMATE SHIFT' },
    { cn: '野生植株过度采集', en: 'OVER-COLLECTION', sub: '野生个体被移除', subEn: 'WILD INDIVIDUALS REMOVED' },
  ],
  summaryCn: '完整环境由多个关系共同支撑',
  summaryEn: 'HABITAT INTEGRITY = MULTIPLE DEPENDENCIES',
};

export const S5 = {
  rows: [
    { en: 'HABITAT DATA', state: 'INCOMPLETE', cn: '栖息地数据', stateCn: '不完整', tone: 'amber' },
    { en: 'POLLINATION DATA', state: 'PARTIAL', cn: '传粉数据', stateCn: '部分获取', tone: 'amber' },
    { en: 'SPECIMEN 017', state: 'STABLE', cn: '样本 017 号', stateCn: '稳定', tone: 'cyan' },
  ],
  underground: { cn: '地下生态数据', stateCn: '未获取', en: 'UNDERGROUND ECOLOGY DATA', state: 'NOT ACQUIRED' },
};

export const S6 = { en: 'SYSTEM CLOSE FAILED', cn: '系统关闭失败', cmd: 'SESSION.EXIT' };

export const S7 = {
  video: humanVideoUrl,
  specimenEn: 'SPECIMEN 000',
  specimenCn: '样本 000 号',
  humanEn: 'HUMAN',
  humanCn: '人类',
  statusEn: 'STATUS: ACTIVE',
  statusCn: '状态：激活',
  profile: [
    { cn: '姓名', en: 'NAME', v: '未知（系统未收录）', src: 'id' },
    { cn: '性别', en: 'GENDER', v: '男', src: 'id' },
    { cn: '年龄', en: 'AGE', v: '26', src: 'id' },
    { cn: '身高', en: 'HEIGHT', v: '180 cm', src: 'id' },
    { cn: '职业', en: 'OCCUPATION', v: '复现校验员／研究员', src: 'id' },
    { cn: '所属项目', en: 'PROJECT', v: '自然样本研究计划（NSRP）', src: 'id' },
    { cn: '标记时间', en: 'TAG TIME', v: '2026-10-08 14:32:17', src: 'sys' },
  ],
  bio: [
    { cn: '心率', en: 'HEART RATE', v: '72', unit: '次／分钟', base: 72, amp: 0.6 },
    { cn: '体温', en: 'BODY TEMP', v: '36.5', unit: '℃', base: 36.5, amp: 0.02 },
    { cn: '脑电指标', en: 'EEG INDEX', v: '0.42', unit: '系统归一化', base: 0.42, amp: 0.01 },
    { cn: '情绪波动', en: 'AFFECT VAR.', v: '0.08', unit: '系统归一化', base: 0.08, amp: 0.006 },
  ],
  tagLine: { pre: '该个体已被系统标记为：', id: 'SPECIMEN 000／样本 000 号' },
  reason: '长期进入 VR 自然样本环境，生理数据异常稳定，符合样本特征。',
  match: [
    { cn: '大脑活动模式', en: 'BRAIN ACTIVITY PATTERN', v: 87 },
    { cn: '基因序列片段', en: 'GENE SEQUENCE FRAGMENTS', v: 76 },
    { cn: '细胞代谢特征', en: 'CELL METABOLISM', v: 69 },
    { cn: '瞳孔反应特征', en: 'PUPIL RESPONSE', v: 72 },
  ],
  radar: [
    { cn: '注意力', en: 'ATTENTION', v: 0.38 },
    { cn: '自我控制', en: 'SELF-CONTROL', v: 0.41 },
    { cn: '记忆', en: 'MEMORY', v: 0.18 },
    { cn: '工作记忆', en: 'WORKING MEM.', v: 0.18 },
    { cn: '推理', en: 'REASONING', v: 0.0 },
    { cn: '情绪稳定性', en: 'EMOTIONAL STAB.', v: 0.34 },
  ],
  activity: [
    { t: '2026-10-08 14:12', cn: '进入 VR 样本空间（紫纹兜兰）', key: true },
    { t: '2026-10-08 14:03', cn: '设备自检／数据上传' },
    { t: '2026-10-08 13:47', cn: '采集样本图像／开始分析' },
    { t: '2026-10-08 12:30', cn: '工作区活动' },
    { t: '2026-10-07 19:22', cn: '休息／资料查阅' },
    { t: '2026-10-07 16:03', cn: 'VR 训练／样本学习' },
  ],
  dataLog: [
    { cn: '样本处理', en: 'SPECIMENS PROCESSED', kind: 'ratio', v: 37, of: 100 },
    { cn: '数据校验', en: 'DATA VALIDATION', kind: 'pct', v: 68 },
    { cn: '分析进度', en: 'ANALYSIS', kind: 'pct', v: 45 },
    { cn: '下次任务', en: 'NEXT TASK', kind: 'text', v: '森林样本-03' },
    { cn: '当前对象', en: 'CURRENT OBJECT', kind: 'text', v: 'SPECIMEN 000' },
  ],
  footer: '该档案仅供科研使用，未经允许禁止访问。',
};

// ---- Plate (shots 3, 4, 5) --------------------------------------------------
// Coordinates are normalised to the image: [u, v] with (0,0) top-left.
// Frames are [u, v, w, h]. Press C in the player to see / drag them.
export const PLATE = {
  src: plateUrl,
  // looping footage for shots 3–4. `fit` places the video frame in plate
  // coords [u, v, w, h] so the calibration below still lands on the plant.
  video: { src: plateVideoUrl, fit: [0, 0, 1.0132, 1.033] },
  plantPoly: [
    [0.544, 0.105], [0.562, 0.22], [0.552, 0.33], [0.6, 0.43], [0.628, 0.515],
    [0.585, 0.5], [0.566, 0.54], [0.53, 0.565], [0.5, 0.6], [0.545, 0.68],
    [0.645, 0.8], [0.655, 0.86], [0.68, 1.0], [0.3, 1.0], [0.26, 0.78],
    [0.155, 0.58], [0.098, 0.465], [0.16, 0.445], [0.235, 0.48], [0.245, 0.35],
    [0.3, 0.42], [0.33, 0.5], [0.322, 0.54], [0.38, 0.45], [0.437, 0.36],
    [0.43, 0.27], [0.44, 0.2], [0.48, 0.14],
  ],
  frames: {
    plant: [0.15, 0.09, 0.48, 0.8],
    leaf: [0.13, 0.42, 0.24, 0.34],
    texture: [0.268, 0.435, 0.05, 0.075],
    flower: [0.31, 0.09, 0.33, 0.49],
  },
  anchors: {
    leaf: [0.245, 0.535],
    texture: [0.293, 0.4725],
    dorsal: [0.49, 0.22],
    staminode: [0.494, 0.375],
    lip: [0.522, 0.475],
    petalR: [0.598, 0.462],
    petalL: [0.37, 0.48],
    petalTipL: [0.322, 0.537],
    petalTipR: [0.625, 0.515],
    base: [0.38, 0.83],
  },
};
