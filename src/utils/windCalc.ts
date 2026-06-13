import type {
  WindDirection,
  WindStrength,
  TidePhase,
  MonsoonSeason,
  WindCondition,
  RouteWindAnalysis,
  City,
  Route,
} from '../../shared/types';

const WIND_DIRECTIONS: WindDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const DIRECTION_VECTORS: Record<WindDirection, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  NE: { dx: 0.707, dy: -0.707 },
  E: { dx: 1, dy: 0 },
  SE: { dx: 0.707, dy: 0.707 },
  S: { dx: 0, dy: 1 },
  SW: { dx: -0.707, dy: 0.707 },
  W: { dx: -1, dy: 0 },
  NW: { dx: -0.707, dy: -0.707 },
};

const DIRECTION_NAMES: Record<WindDirection, string> = {
  N: '北风',
  NE: '东北风',
  E: '东风',
  SE: '东南风',
  S: '南风',
  SW: '西南风',
  W: '西风',
  NW: '西北风',
};

const STRENGTH_NAMES: Record<WindStrength, string> = {
  calm: '无风',
  light: '轻风',
  moderate: '和风',
  strong: '劲风',
  gale: '狂风',
};

const STRENGTH_ICONS: Record<WindStrength, string> = {
  calm: '🍃',
  light: '🌬️',
  moderate: '💨',
  strong: '🌪️',
  gale: '⛈️',
};

const TIDE_NAMES: Record<TidePhase, string> = {
  high: '满潮',
  rising: '涨潮',
  low: '枯潮',
  falling: '退潮',
};

const TIDE_ICONS: Record<TidePhase, string> = {
  high: '🌊',
  rising: '🔼',
  low: '🏖️',
  falling: '🔽',
};

const MONSOON_NAMES: Record<MonsoonSeason, string> = {
  northeast: '东北季风期',
  southwest: '西南季风期',
  transition: '季风转换期',
};

export const getMonsoonSeason = (day: number): MonsoonSeason => {
  const cycleDay = ((day - 1) % 120) + 1;
  if (cycleDay <= 40) return 'northeast';
  if (cycleDay <= 60) return 'transition';
  if (cycleDay <= 100) return 'southwest';
  return 'transition';
};

const getMonsoonPreferredDirections = (season: MonsoonSeason): WindDirection[] => {
  switch (season) {
    case 'northeast':
      return ['NE', 'N', 'E', 'NW'];
    case 'southwest':
      return ['SW', 'S', 'W', 'SE'];
    case 'transition':
      return ['E', 'S', 'W', 'N'];
  }
};

const getMonsoonPreferredStrength = (season: MonsoonSeason): WindStrength[] => {
  switch (season) {
    case 'northeast':
    case 'southwest':
      return ['moderate', 'strong', 'light', 'gale'];
    case 'transition':
      return ['light', 'calm', 'moderate'];
  }
};

export const generateWindCondition = (
  day: number,
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
): WindCondition => {
  const season = getMonsoonSeason(day);
  const preferredDirs = getMonsoonPreferredDirections(season);
  const preferredStrengths = getMonsoonPreferredStrength(season);

  const dirRoll = Math.random();
  let direction: WindDirection;
  if (dirRoll < 0.75) {
    direction = preferredDirs[Math.floor(Math.random() * preferredDirs.length)];
  } else {
    direction = WIND_DIRECTIONS[Math.floor(Math.random() * WIND_DIRECTIONS.length)];
  }

  const strRoll = Math.random();
  let strength: WindStrength;
  if (strRoll < 0.7) {
    strength = preferredStrengths[Math.floor(Math.random() * preferredStrengths.length)];
  } else {
    const allStrengths: WindStrength[] = ['calm', 'light', 'moderate', 'strong', 'gale'];
    strength = allStrengths[Math.floor(Math.random() * allStrengths.length)];
  }

  if (timeOfDay === 'night') {
    const idx = ['calm', 'light', 'moderate', 'strong', 'gale'].indexOf(strength);
    if (idx > 0 && Math.random() < 0.4) {
      strength = (['calm', 'light', 'moderate', 'strong', 'gale'][idx - 1] as WindStrength);
    }
  }
  if (timeOfDay === 'afternoon' && Math.random() < 0.25) {
    const idx = ['calm', 'light', 'moderate', 'strong', 'gale'].indexOf(strength);
    if (idx < 4) {
      strength = (['calm', 'light', 'moderate', 'strong', 'gale'][idx + 1] as WindStrength);
    }
  }

  const tideCycle = (day * 2 + (timeOfDay === 'morning' ? 0 : timeOfDay === 'afternoon' ? 1 : timeOfDay === 'evening' ? 1.5 : 2)) % 4;
  let tide: TidePhase;
  if (tideCycle < 1) tide = 'rising';
  else if (tideCycle < 2) tide = 'high';
  else if (tideCycle < 3) tide = 'falling';
  else tide = 'low';

  return {
    direction,
    strength,
    tide,
    monsoonSeason: season,
    updatedDay: day,
    updatedTimeOfDay: timeOfDay,
  };
};

export const getTravelDirection = (
  fromCity: City,
  toCity: City
): WindDirection => {
  const dx = toCity.x - fromCity.x;
  const dy = toCity.y - fromCity.y;

  let bestDir: WindDirection = 'E';
  let bestDot = -Infinity;

  for (const dir of WIND_DIRECTIONS) {
    const v = DIRECTION_VECTORS[dir];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const normDx = dx / len;
    const normDy = dy / len;
    const dot = normDx * v.dx + normDy * v.dy;
    if (dot > bestDot) {
      bestDot = dot;
      bestDir = dir;
    }
  }

  return bestDir;
};

const dotProduct = (a: WindDirection, b: WindDirection): number => {
  const va = DIRECTION_VECTORS[a];
  const vb = DIRECTION_VECTORS[b];
  return va.dx * vb.dx + va.dy * vb.dy;
};

const STRENGTH_MULTIPLIERS: Record<WindStrength, { time: number; damage: number; pirate: number }> = {
  calm: { time: 1.3, damage: 1.0, pirate: 1.0 },
  light: { time: 1.1, damage: 1.05, pirate: 1.1 },
  moderate: { time: 1.0, damage: 1.1, pirate: 1.2 },
  strong: { time: 0.9, damage: 1.25, pirate: 1.5 },
  gale: { time: 0.85, damage: 1.5, pirate: 2.0 },
};

const TIDE_MULTIPLIERS: Record<TidePhase, number> = {
  high: 0.95,
  rising: 0.9,
  low: 1.15,
  falling: 1.05,
};

export const analyzeRouteWind = (
  route: Route,
  wind: WindCondition,
  cities: City[],
  fromCityId: string = 'yuegang'
): RouteWindAnalysis => {
  if (route.type !== 'water') {
    return {
      isWaterRoute: false,
      travelDirection: 'E',
      alignment: 'calm',
      alignmentLabel: '陆路运输',
      timeModifier: 1.0,
      damageModifier: 1.0,
      pirateModifier: 1.0,
      tideModifier: 1.0,
      description: '陆路运输不受风向潮汐影响',
      recommended: true,
      waitHours: 0,
    };
  }

  const fromCity = cities.find(c => c.id === fromCityId) || cities.find(c => c.id === route.fromCityId);
  const toCity = cities.find(c => c.id === route.toCityId);
  const actualFrom = fromCity?.id === route.fromCityId ? fromCity : toCity;
  const actualTo = fromCity?.id === route.fromCityId ? toCity : fromCity;

  if (!actualFrom || !actualTo) {
    return {
      isWaterRoute: true,
      travelDirection: 'E',
      alignment: 'crosswind',
      alignmentLabel: '侧风',
      timeModifier: 1.0,
      damageModifier: 1.0,
      pirateModifier: 1.0,
      tideModifier: 1.0,
      description: '无法判断风况，请谨慎出行',
      recommended: true,
      waitHours: 0,
    };
  }

  const travelDir = getTravelDirection(actualFrom, actualTo);
  const dot = dotProduct(travelDir, wind.direction);
  const strMult = STRENGTH_MULTIPLIERS[wind.strength];
  const tideMult = TIDE_MULTIPLIERS[wind.tide];

  let alignment: 'tailwind' | 'headwind' | 'crosswind' | 'calm';
  let alignmentLabel: string;
  let timeModifier: number;
  let damageModifier: number;
  let pirateModifier: number;
  let description: string;
  let recommended: boolean;
  let waitHours: number;

  const strFactor = wind.strength === 'calm' ? 0 : wind.strength === 'light' ? 0.5 : wind.strength === 'moderate' ? 0.8 : 1;

  if (wind.strength === 'calm' || Math.abs(dot) < 0.3) {
    alignment = 'calm';
    alignmentLabel = wind.strength === 'calm' ? '无风' : '侧风';
    timeModifier = strMult.time;
    damageModifier = 1 + (strMult.damage - 1) * 0.5;
    pirateModifier = 1 + (strMult.pirate - 1) * 0.5;
    description = wind.strength === 'calm'
      ? '海面无风，船行缓慢但平稳'
      : `${DIRECTION_NAMES[wind.direction]}与航向交叉，略有影响`;
    recommended = true;
    waitHours = 0;
  } else if (dot >= 0.5) {
    alignment = 'tailwind';
    alignmentLabel = `${STRENGTH_NAMES[wind.strength]}顺风`;
    const tailFactor = 1 - (strMult.time - 1) * strFactor;
    timeModifier = Math.max(0.55, tailFactor);
    damageModifier = 1 + (strMult.damage - 1) * 0.2;
    pirateModifier = 1 + (strMult.pirate - 1) * 0.1;
    description = `${DIRECTION_NAMES[wind.direction]}顺帆而行，航速大增`;
    recommended = true;
    waitHours = 0;
  } else if (dot <= -0.5) {
    alignment = 'headwind';
    alignmentLabel = `${STRENGTH_NAMES[wind.strength]}逆风`;
    const headFactor = 1 + (strMult.time - 1 + 0.3) * strFactor;
    timeModifier = Math.min(2.0, headFactor);
    damageModifier = 1 + (strMult.damage - 1) * 1.5;
    pirateModifier = 1 + (strMult.pirate - 1) * 2;
    description = `${DIRECTION_NAMES[wind.direction]}顶风而行，航速大减，风险陡增`;
    recommended = wind.strength === 'light';
    waitHours = estimateWaitForTailwind(wind, travelDir);
  } else {
    alignment = 'crosswind';
    alignmentLabel = `${STRENGTH_NAMES[wind.strength]}侧风`;
    timeModifier = 1 + (strMult.time - 1) * 0.3 * strFactor;
    damageModifier = 1 + (strMult.damage - 1) * 0.7;
    pirateModifier = 1 + (strMult.pirate - 1) * 0.8;
    description = `${DIRECTION_NAMES[wind.direction]}侧风航行，略有波折`;
    recommended = wind.strength !== 'strong' && wind.strength !== 'gale';
    waitHours = wind.strength === 'gale' || wind.strength === 'strong'
      ? estimateWaitForTailwind(wind, travelDir)
      : 0;
  }

  return {
    isWaterRoute: true,
    travelDirection: travelDir,
    alignment,
    alignmentLabel,
    timeModifier: timeModifier * tideMult,
    damageModifier,
    pirateModifier,
    tideModifier: tideMult,
    description,
    recommended,
    waitHours,
  };
};

const estimateWaitForTailwind = (
  currentWind: WindCondition,
  travelDir: WindDirection
): number => {
  const season = currentWind.monsoonSeason;
  const preferredDirs = getMonsoonPreferredDirections(season);
  const currentDot = dotProduct(travelDir, currentWind.direction);

  if (currentDot >= 0.5) return 0;

  let probPerChange = 0;
  for (const dir of preferredDirs) {
    if (dotProduct(travelDir, dir) >= 0.3) probPerChange += 0.75 / preferredDirs.length;
  }
  for (const dir of WIND_DIRECTIONS) {
    if (dotProduct(travelDir, dir) >= 0.3) probPerChange += 0.25 / WIND_DIRECTIONS.length;
  }

  if (probPerChange <= 0) return 24;

  const expectedChanges = Math.ceil(1 / probPerChange);
  const hoursPerChange = 6;
  const base = expectedChanges * hoursPerChange;

  const seasonBonus = season === 'transition' ? 1.3 : 1;
  return Math.ceil(base * seasonBonus);
};

export const getWindDirectionName = (dir: WindDirection): string => DIRECTION_NAMES[dir];
export const getWindStrengthName = (str: WindStrength): string => STRENGTH_NAMES[str];
export const getWindStrengthIcon = (str: WindStrength): string => STRENGTH_ICONS[str];
export const getTideName = (tide: TidePhase): string => TIDE_NAMES[tide];
export const getTideIcon = (tide: TidePhase): string => TIDE_ICONS[tide];
export const getMonsoonName = (season: MonsoonSeason): string => MONSOON_NAMES[season];

export const getWindConditionSummary = (wind: WindCondition): string => {
  return `${getWindStrengthIcon(wind.strength)} ${getWindStrengthName(wind.strength)}${getWindDirectionName(wind.direction)} · ${getTideIcon(wind.tide)}${getTideName(wind.tide)} · ${getMonsoonName(wind.monsoonSeason)}`;
};
