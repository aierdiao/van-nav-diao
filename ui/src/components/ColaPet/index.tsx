import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./index.css";

type PetMode = "light" | "dark";
type PetState =
  | "idle"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review"
  | "sleep-loaf-front"
  | "sleep-loaf-back"
  | "sleep-curled-side"
  | "curious-up";

type PositionKey =
  | "tag-left"
  | "tag-center"
  | "tag-right"
  | "left-perch"
  | "right-perch"
  | "right-rest"
  | "left-rest";

type DialogKind =
  | "nav"
  | "catFood"
  | "philosophy"
  | "story"
  | "touch"
  | "sleepTouch"
  | "dark";

type DialogLine = {
  text: string;
  kind: DialogKind;
};

type PetPoint = {
  x: number;
  y: number;
};

type PreviousSprite = {
  key: number;
  row: number;
  frame: number;
} | null;

const PET_ASSET = "/pets/cola/spritesheet.webp";
const DESKTOP_PET_WIDTH = 124;
const MOBILE_PET_WIDTH = 82;
const PET_ASPECT = 208 / 192;

const STATE_META: Record<PetState, { row: number; frames: number; interval: number }> = {
  idle: { row: 0, frames: 1, interval: 2200 },
  "running-right": { row: 1, frames: 8, interval: 135 },
  "running-left": { row: 2, frames: 8, interval: 135 },
  waving: { row: 3, frames: 4, interval: 650 },
  jumping: { row: 4, frames: 5, interval: 320 },
  failed: { row: 5, frames: 8, interval: 1000 },
  waiting: { row: 6, frames: 1, interval: 2200 },
  running: { row: 7, frames: 6, interval: 700 },
  review: { row: 8, frames: 6, interval: 1500 },
  "sleep-loaf-front": { row: 9, frames: 5, interval: 1700 },
  "sleep-loaf-back": { row: 10, frames: 5, interval: 1800 },
  "sleep-curled-side": { row: 11, frames: 5, interval: 1750 },
  "curious-up": { row: 12, frames: 1, interval: 2200 },
};

const DARK_REST_STATES: PetState[] = [
  "sleep-loaf-front",
  "sleep-loaf-back",
  "sleep-curled-side",
];

const LIGHT_POSITIONS: PositionKey[] = [
  "tag-left",
  "tag-center",
  "tag-right",
  "left-perch",
  "right-perch",
];

const DARK_POSITIONS: PositionKey[] = ["right-rest", "left-rest", "right-perch"];

const DIALOG_LINES: DialogLine[] = [
  { kind: "catFood", text: "谢谢你点进来，主人离猫粮自由又近了一点点。" },
  { kind: "catFood", text: "如果这个链接有返利，我会认真记进猫粮账本。" },
  { kind: "catFood", text: "这不是广告，这是可乐的晚饭。" },
  { kind: "catFood", text: "点得好，猫粮碗里有回响。" },
  { kind: "catFood", text: "如果觉得有用，可以让可乐多吃一口。" },
  { kind: "catFood", text: "返利不是目的，猫粮才是。" },
  { kind: "catFood", text: "不要为了返利乱买，可乐不吃冲动消费。" },
  { kind: "catFood", text: "买之前想三秒，省下来的钱也可以买猫粮。" },
  { kind: "catFood", text: "愿你的付款都值得，愿我的猫粮都准时。" },
  { kind: "catFood", text: "你负责找工具，主人负责买猫粮，我负责可爱。" },
  { kind: "catFood", text: "如果你用了返利链接，我会假装很矜持。" },
  { kind: "catFood", text: "我不是催你消费，只是提醒你理性投喂。" },
  { kind: "catFood", text: "猫粮自由，从每一次认真选择开始。" },
  { kind: "catFood", text: "这个链接闻起来像罐头预算。" },
  { kind: "catFood", text: "主人说要理性消费，我说可以理性加餐。" },
  { kind: "catFood", text: "如果省下了时间，也许可以多摸我十秒。" },
  { kind: "catFood", text: "可乐的饭碗感谢每一次有用的选择。" },
  { kind: "catFood", text: "别乱买，猫粮也喜欢清醒的预算。" },
  { kind: "catFood", text: "有用再点，没用就放过钱包。" },
  { kind: "catFood", text: "今天的猫粮 KPI 看起来很有希望。" },
  { kind: "nav", text: "导航站的意义，是少走弯路，多留点力气生活。" },
  { kind: "nav", text: "找不到工具的时候，可以先搜一下。" },
  { kind: "nav", text: "分类是猫的领地，标签是猫留下的脚印。" },
  { kind: "nav", text: "你在找 AI 工具吗？我刚从那一栏路过。" },
  { kind: "nav", text: "收藏之前，先确认你真的会用。" },
  { kind: "nav", text: "工具很多，但今天只需要一个能解决问题的。" },
  { kind: "nav", text: "别被名字吓到，点进去看看真实页面。" },
  { kind: "nav", text: "好的工具像纸箱，朴素但好用。" },
  { kind: "nav", text: "坏工具像空罐头，响得很，没东西。" },
  { kind: "nav", text: "如果页面打开慢，我也会眯起眼睛。" },
  { kind: "nav", text: "这个链接似乎值得一闻。" },
  { kind: "nav", text: "我不懂 SaaS，但我懂谁在认真做东西。" },
  { kind: "nav", text: "别一次打开太多标签页，猫会迷路。" },
  { kind: "nav", text: "搜索词短一点，猫爪好按。" },
  { kind: "nav", text: "工具不是越多越好，能被用起来才好。" },
  { kind: "nav", text: "今天也在为你的收藏夹减负。" },
  { kind: "nav", text: "如果它解决不了问题，就换一个。" },
  { kind: "nav", text: "别迷信榜单，猫更相信实际体验。" },
  { kind: "nav", text: "免费也有成本，成本通常是时间。" },
  { kind: "nav", text: "贵不一定好，便宜不一定省。" },
  { kind: "nav", text: "猫判断工具的方法：有没有真的帮到人。" },
  { kind: "nav", text: "如果你犹豫，就先加入待看。" },
  { kind: "nav", text: "别把每个工具都当救命稻草。" },
  { kind: "nav", text: "真正有用的东西，会在你需要时留下来。" },
  { kind: "nav", text: "你可以少一点完美，多一点开始。" },
  { kind: "nav", text: "先用起来，再决定要不要升级。" },
  { kind: "nav", text: "别让订阅列表长成猫尾巴。" },
  { kind: "nav", text: "这个分类闻起来像效率。" },
  { kind: "nav", text: "那个标签闻起来像灵感。" },
  { kind: "nav", text: "搜索结果不满意？换个词试试。" },
  { kind: "nav", text: "人类发明了收藏夹，然后忘记自己收藏过什么。" },
  { kind: "nav", text: "愿你找到工具，也找到一点轻松。" },
  { kind: "nav", text: "愿今天的链接都能打开。" },
  { kind: "nav", text: "如果世界很乱，就先整理一个书签。" },
  { kind: "nav", text: "首页不是退路，是重新开始。" },
  { kind: "nav", text: "404 不一定是结束，也可能是换个入口。" },
  { kind: "nav", text: "不要在错误页面住太久。" },
  { kind: "philosophy", text: "弗洛伊德可能会问：你真正想找的是什么？" },
  { kind: "philosophy", text: "阿德勒可能会说：问题不只是工具，也是目标。" },
  { kind: "philosophy", text: "荣格会喜欢标签页，里面全是原型。" },
  { kind: "philosophy", text: "尼采大概会嫌你收藏太多、行动太少。" },
  { kind: "philosophy", text: "深渊回望你的时候，也可能只是浏览器黑屏。" },
  { kind: "philosophy", text: "你凝视搜索框时，搜索框也在凝视你。" },
  { kind: "philosophy", text: "所谓自由意志，也包括关闭不需要的标签页。" },
  { kind: "philosophy", text: "每一次选择工具，都是在选择一种生活方式。" },
  { kind: "philosophy", text: "别让工具替你生活，它只能替你省一点力气。" },
  { kind: "philosophy", text: "效率不是人生的答案，但没效率真的会烦。" },
  { kind: "philosophy", text: "意义不会自动出现，但猫会。" },
  { kind: "philosophy", text: "人需要目标，猫需要稳定的饭点。" },
  { kind: "philosophy", text: "有时候你不是缺工具，你是缺休息。" },
  { kind: "philosophy", text: "不要把焦虑伪装成生产力。" },
  { kind: "philosophy", text: "人的困境复杂，猫粮的需求很明确。" },
  { kind: "philosophy", text: "你以为你在选工具，其实你在整理欲望。" },
  { kind: "philosophy", text: "每个收藏夹都有一点潜意识。" },
  { kind: "philosophy", text: "别急着优化人生，先优化今天这一小步。" },
  { kind: "philosophy", text: "阿德勒会提醒你：今天也可以重新选择。" },
  { kind: "philosophy", text: "荣格说阴影，我说先打开暗色模式休息。" },
  { kind: "story", text: "我从床底走出来，也不是一天完成的。" },
  { kind: "story", text: "慢热不是冷漠，是谨慎地相信世界。" },
  { kind: "story", text: "有些信任，要靠很多个普通下午攒出来。" },
  { kind: "story", text: "安静不是没感情，是把感情放得很稳。" },
  { kind: "story", text: "我不负责热闹，我负责陪着。" },
  { kind: "story", text: "我以前也躲在角落，后来角落变成了家。" },
  { kind: "story", text: "被看见之前，我先学会了观察。" },
  { kind: "story", text: "谢谢你提供猫粮，也谢谢你还在这里。" },
  { kind: "story", text: "我从床底走到枕头，也花了时间。" },
  { kind: "story", text: "你从现在走到以后，也可以花时间。" },
  { kind: "story", text: "我会多陪主人几年，越久越好。" },
  { kind: "story", text: "如果心里很乱，就先摸摸可乐。" },
  { kind: "story", text: "我在这里。" },
  { kind: "story", text: "8月5日，是我换一种生活的日子。" },
  { kind: "story", text: "那个笼子不重要，后来我有了家。" },
  { kind: "dark", text: "黑暗模式已开启，可乐进入低电量陪伴。" },
  { kind: "dark", text: "晚上适合少一点链接，多一点呼吸。" },
  { kind: "dark", text: "我在休息，但耳朵还开着。" },
  { kind: "dark", text: "夜里不要打开太多标签页，梦会变吵。" },
  { kind: "dark", text: "暗色模式里，猫会更像一小块安静。" },
  { kind: "dark", text: "今天差不多了，剩下的可以明天再找。" },
  { kind: "dark", text: "可乐建议：收藏可以，熬夜不必。" },
  { kind: "dark", text: "如果你还在逛，我就再陪一会儿。" },
  { kind: "touch", text: "喵。你碰到我了，我换个地方躺。" },
  { kind: "touch", text: "摸可以，乱买不行。" },
  { kind: "touch", text: "收到抚摸，已兑换成一点点勇气。" },
  { kind: "touch", text: "我让开啦，你继续看标签。" },
  { kind: "touch", text: "猫爪撤离，链接归还。" },
  { kind: "touch", text: "你点我，不如点个真的有用的工具。" },
  { kind: "touch", text: "这里挡住了吗？我假装不是故意的。" },
  { kind: "touch", text: "好吧好吧，我跑开一点。" },
  { kind: "touch", text: "主人说要有礼貌，所以我让路。" },
  { kind: "touch", text: "可乐已移动，猫粮账本继续打开。" },
  { kind: "touch", text: "摸到猫了，今天的运气加一点。" },
  { kind: "touch", text: "我挪开，不耽误你点有用的链接。" },
  { kind: "touch", text: "别点太重，猫是液体但不是按钮。" },
  { kind: "touch", text: "你摸我一下，我替主人谢谢你一下。" },
  { kind: "touch", text: "好啦，我把标签还给你。" },
  { kind: "touch", text: "这里不是猫窝吗？那我换一个地方。" },
  { kind: "touch", text: "触摸确认，已触发可乐小跑。" },
  { kind: "touch", text: "别急，我正在按猫的速度让路。" },
  { kind: "touch", text: "如果挡住了链接，那一定是我太想参与。" },
  { kind: "touch", text: "摸摸可以，顺手看看有没有真需要的工具。" },
  { kind: "sleepTouch", text: "你叫醒了一只猫，也叫醒了宇宙的耐心。" },
  { kind: "sleepTouch", text: "尼采说要成为自己，我说先让我睡成自己。" },
  { kind: "sleepTouch", text: "弗洛伊德会解释这个梦，我只想继续做这个梦。" },
  { kind: "sleepTouch", text: "阿德勒讲目标，我的目标是再睡五分钟。" },
  { kind: "sleepTouch", text: "荣格说阴影整合，我说被窝整合。" },
  { kind: "sleepTouch", text: "你摸到的不是猫，是正在缓存的灵魂。" },
  { kind: "sleepTouch", text: "人生需要意义，猫需要不被突然开机。" },
  { kind: "sleepTouch", text: "别担心，我没有生气，只是在重启温柔。" },
  { kind: "sleepTouch", text: "睡眠是猫对虚无主义的实际反驳。" },
  { kind: "sleepTouch", text: "这一摸很有存在主义，但也很打扰。" },
  { kind: "sleepTouch", text: "你负责点击世界，我负责退出世界五分钟。" },
  { kind: "sleepTouch", text: "如果自由意志存在，请选择让我继续睡。" },
  { kind: "sleepTouch", text: "我刚在梦里把收藏夹整理好了，又被你点乱了。" },
  { kind: "sleepTouch", text: "猫的潜意识里没有 KPI，只有暖和的地方。" },
  { kind: "sleepTouch", text: "你以为你在撸猫，其实猫在训练你的分寸感。" },
  { kind: "sleepTouch", text: "请把这次触摸记为一次温柔的系统中断。" },
  { kind: "sleepTouch", text: "世界很吵，所以猫把自己折成静音模式。" },
  { kind: "sleepTouch", text: "我不是懒，我是在和时间保持距离。" },
  { kind: "sleepTouch", text: "如果梦有标签，我刚刚在浏览好梦分类。" },
  { kind: "sleepTouch", text: "摸完请轻声离开，哲学和猫都需要余韵。" },
];

const getMode = (): PetMode =>
  document.body.classList.contains("dark-mode") || document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";

const LIGHT_NAP_CHANCE = 0.35;

const getRestStateForMode = (mode: PetMode): PetState =>
  mode === "dark" || Math.random() < LIGHT_NAP_CHANCE
    ? DARK_REST_STATES[Math.floor(Math.random() * DARK_REST_STATES.length)]
    : "idle";

const isSleepingState = (state: PetState) => DARK_REST_STATES.includes(state);

const randomBetween = (min: number, max: number) =>
  Math.floor(min + Math.random() * (max - min + 1));

const choose = <T,>(items: T[], fallback: T): T =>
  items.length ? items[Math.floor(Math.random() * items.length)] : fallback;

const isMobileViewport = () => window.matchMedia("(max-width: 720px)").matches;

const getPositionGroup = (mode: PetMode) => (mode === "dark" ? DARK_POSITIONS : LIGHT_POSITIONS);

const pickNextPosition = (mode: PetMode, current: PositionKey, avoidTagArea = false): PositionKey => {
  const group = getPositionGroup(mode).filter((item) => item !== current);
  const filtered = avoidTagArea ? group.filter((item) => !item.startsWith("tag-")) : group;
  return choose(filtered, mode === "dark" ? "right-rest" : "tag-right");
};

const getPetSize = () => {
  const width = isMobileViewport() ? MOBILE_PET_WIDTH : DESKTOP_PET_WIDTH;
  return { width, height: width * PET_ASPECT };
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getDestinationPoint = (key: PositionKey): PetPoint => {
  const { width, height } = getPetSize();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const topMin = isMobileViewport() ? 108 : 106;
  const topMax = isMobileViewport() ? 152 : 196;
  const bottomRest = isMobileViewport()
    ? clamp(viewportHeight - height - 136, 104, viewportHeight - height - 72)
    : clamp(viewportHeight - height - 170, 134, viewportHeight - height - 108);
  const bottomPerch = isMobileViewport()
    ? clamp(viewportHeight - height - 168, 118, viewportHeight - height - 88)
    : clamp(viewportHeight - height - 214, 144, viewportHeight - height - 116);

  const map: Record<PositionKey, PetPoint> = {
    "tag-left": {
      x: clamp(viewportWidth * 0.11, 12, viewportWidth - width - 12),
      y: clamp(viewportHeight * 0.17, topMin, topMax),
    },
    "tag-center": {
      x: clamp(viewportWidth * 0.5 - width * 0.5, 12, viewportWidth - width - 12),
      y: clamp(viewportHeight * 0.19, topMin, topMax + 18),
    },
    "tag-right": {
      x: clamp(viewportWidth - width - viewportWidth * 0.13, 12, viewportWidth - width - 12),
      y: clamp(viewportHeight * 0.17, topMin, topMax),
    },
    "left-perch": {
      x: clamp(viewportWidth * 0.06, 12, viewportWidth - width - 12),
      y: bottomPerch,
    },
    "right-perch": {
      x: clamp(viewportWidth - width - viewportWidth * 0.07, 12, viewportWidth - width - 12),
      y: bottomPerch,
    },
    "right-rest": {
      x: clamp(viewportWidth - width - viewportWidth * 0.04, 10, viewportWidth - width - 8),
      y: bottomRest,
    },
    "left-rest": {
      x: clamp(viewportWidth * 0.04, 10, viewportWidth - width - 8),
      y: bottomRest,
    },
  };

  return map[key];
};

const distanceBetween = (a: PetPoint, b: PetPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const nextPaint = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });

const pickWeightedLine = (
  mode: PetMode,
  recent: string[],
  forceKind?: DialogKind
): DialogLine => {
  const lightWeights: DialogKind[] = [
    "nav",
    "nav",
    "nav",
    "nav",
    "catFood",
    "catFood",
    "philosophy",
    "philosophy",
    "story",
  ];
  const darkWeights: DialogKind[] = [
    "dark",
    "dark",
    "story",
    "story",
    "philosophy",
    "philosophy",
    "nav",
    "catFood",
  ];
  const kind = forceKind || choose(mode === "dark" ? darkWeights : lightWeights, "nav");
  const candidates = DIALOG_LINES.filter(
    (line) => line.kind === kind && !recent.includes(line.text)
  );
  const fallback = DIALOG_LINES.find((line) => line.kind === kind) || DIALOG_LINES[0];
  return choose(candidates, fallback);
};

const ColaPet: React.FC = () => {
  const [assetReady, setAssetReady] = useState(false);
  const [mode, setMode] = useState<PetMode>(() =>
    typeof document === "undefined" ? "light" : getMode()
  );
  const [state, setState] = useState<PetState>("idle");
  const [frame, setFrame] = useState(0);
  const [positionKey, setPositionKey] = useState<PositionKey>("right-perch");
  const [position, setPosition] = useState<PetPoint>(() => ({ x: 0, y: 0 }));
  const [moveDuration, setMoveDuration] = useState(0);
  const [dialog, setDialog] = useState<DialogLine | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [previousSprite, setPreviousSprite] = useState<PreviousSprite>(null);
  const [handVisible, setHandVisible] = useState(false);
  const [handPoint, setHandPoint] = useState<PetPoint>({ x: 0, y: 0 });
  const recentLinesRef = useRef<string[]>([]);
  const dialogStepRef = useRef(0);
  const dialogTimerRef = useRef<number | null>(null);
  const hideDialogTimerRef = useRef<number | null>(null);
  const motionTimerRef = useRef<number | null>(null);
  const roamTimerRef = useRef<number | null>(null);
  const actionTimerRef = useRef<number | null>(null);
  const previousSpriteTimerRef = useRef<number | null>(null);
  const petRef = useRef<HTMLElement | null>(null);
  const positionRef = useRef<PetPoint>({ x: 0, y: 0 });
  const stateRef = useRef<PetState>("idle");
  const frameRef = useRef(0);
  const modeRef = useRef<PetMode>(mode);
  const spriteKeyRef = useRef(0);
  const moveSequenceRef = useRef(0);

  const meta = STATE_META[state];

  const scheduleDialog = (delay: number) => {
    if (dialogTimerRef.current) window.clearTimeout(dialogTimerRef.current);
    const mobileMultiplier = isMobileViewport() ? 1.45 : 1;
    const darkMultiplier = mode === "dark" ? 1.25 : 1;
    dialogTimerRef.current = window.setTimeout(() => {
      showDialog();
    }, delay * mobileMultiplier * darkMultiplier);
  };

  const getNextDialogDelay = () => {
    dialogStepRef.current += 1;
    if (dialogStepRef.current === 1) return 10000;
    if (dialogStepRef.current === 2) return randomBetween(20000, 40000);
    return randomBetween(60000, 120000);
  };

  const rememberLine = (text: string) => {
    recentLinesRef.current = [text, ...recentLinesRef.current.filter((item) => item !== text)].slice(0, 14);
  };

  const showDialog = (forceKind?: DialogKind) => {
    const nextLine = pickWeightedLine(mode, recentLinesRef.current, forceKind);
    rememberLine(nextLine.text);
    setDialog(nextLine);
    setDialogVisible(true);

    if (hideDialogTimerRef.current) window.clearTimeout(hideDialogTimerRef.current);
    hideDialogTimerRef.current = window.setTimeout(() => {
      setDialogVisible(false);
    }, forceKind === "touch" ? 5600 : randomBetween(5200, 8200));

    if (!forceKind) scheduleDialog(getNextDialogDelay());
  };

  const setPetState = useCallback((nextState: PetState) => {
    const currentState = stateRef.current;
    if (currentState === nextState) return;
    const currentMeta = STATE_META[currentState];
    setPreviousSprite({
      key: spriteKeyRef.current++,
      row: currentMeta.row,
      frame: frameRef.current,
    });
    if (previousSpriteTimerRef.current) window.clearTimeout(previousSpriteTimerRef.current);
    previousSpriteTimerRef.current = window.setTimeout(() => {
      setPreviousSprite(null);
    }, 680);
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const restStateForMode = useCallback(
    () => getRestStateForMode(mode),
    [mode]
  );

  const runBriefMotion = useCallback((nextState: PetState, duration = 4200) => {
    setPetState(nextState);
    if (motionTimerRef.current) window.clearTimeout(motionTimerRef.current);
    motionTimerRef.current = window.setTimeout(() => {
      setPetState(restStateForMode());
    }, duration);
  }, [restStateForMode, setPetState]);

  const getLivePosition = useCallback((): PetPoint => {
    const box = petRef.current?.getBoundingClientRect();
    if (!box) return positionRef.current;
    return { x: box.x, y: box.y };
  }, []);

  const moveTo = useCallback(async (nextKey: PositionKey, forceDuration?: number) => {
    const nextPoint = getDestinationPoint(nextKey);
    const currentPoint = getLivePosition();
    const distance = distanceBetween(currentPoint, nextPoint);
    const speed = isMobileViewport() ? 0.105 : 0.13;
    const duration = forceDuration || clamp(Math.round(distance / speed), 900, 5600);
    const movingRight = nextPoint.x >= currentPoint.x;
    const sequence = moveSequenceRef.current + 1;
    moveSequenceRef.current = sequence;

    if (motionTimerRef.current) window.clearTimeout(motionTimerRef.current);
    setMoveDuration(0);
    positionRef.current = currentPoint;
    setPosition(currentPoint);
    await nextPaint();
    if (moveSequenceRef.current !== sequence) return;
    setPositionKey(nextKey);
    setMoveDuration(duration);
    positionRef.current = nextPoint;
    setPosition(nextPoint);
    setPetState(movingRight ? "running-right" : "running-left");

    motionTimerRef.current = window.setTimeout(() => {
      setPetState(restStateForMode());
    }, duration + 120);
  }, [getLivePosition, restStateForMode, setPetState]);

  const moveAway = () => {
    const next = pickNextPosition(mode, positionKey, true);
    const dialogKind: DialogKind = isSleepingState(stateRef.current) ? "sleepTouch" : "touch";
    setHandVisible(false);
    moveTo(next);
    showDialog(dialogKind);
  };

  const updatePettingHand = (event: React.MouseEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setHandPoint({
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    });
  };

  const showPettingHand = (event: React.MouseEvent<HTMLButtonElement>) => {
    updatePettingHand(event);
    setHandVisible(true);
  };

  const hidePettingHand = () => {
    setHandVisible(false);
  };

  useEffect(() => {
    const loadImage = () => {
      const img = new Image();
      img.onload = () => setAssetReady(true);
      img.onerror = () => {
        console.warn("Failed to load Cola pet spritesheet:", PET_ASSET);
      };
      img.src = PET_ASSET;
    };
    const idle = window.requestIdleCallback;
    if (idle) {
      const id = idle(loadImage, { timeout: 2400 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(loadImage, 1600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateMode = () => {
      const nextMode = getMode();
      if (nextMode === modeRef.current) return;
      modeRef.current = nextMode;
      const nextKey = nextMode === "dark" ? "right-rest" : "right-perch";
      const nextPoint = getDestinationPoint(nextKey);
      setMode(nextMode);
      setPositionKey(nextKey);
      setMoveDuration(0);
      positionRef.current = nextPoint;
      setPosition(nextPoint);
      const nextRestState = getRestStateForMode(nextMode);
      stateRef.current = nextRestState;
      setState(nextRestState);
    };
    modeRef.current = getMode();
    const initialKey = modeRef.current === "dark" ? "right-rest" : "right-perch";
    const initialPoint = getDestinationPoint(initialKey);
    setMode(modeRef.current);
    setPositionKey(initialKey);
    setMoveDuration(0);
    positionRef.current = initialPoint;
    setPosition(initialPoint);
    const initialRestState = getRestStateForMode(modeRef.current);
    stateRef.current = initialRestState;
    setState(initialRestState);

    const observer = new MutationObserver(updateMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (meta.frames <= 1) return undefined;
    const interval = window.setInterval(() => {
      setFrame((current) => (current + 1) % meta.frames);
    }, meta.interval);
    return () => window.clearInterval(interval);
  }, [meta.frames, meta.interval]);

  useEffect(() => {
    setFrame(0);
  }, [state]);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    const handleResize = () => {
      const nextPoint = getDestinationPoint(positionKey);
      positionRef.current = nextPoint;
      setMoveDuration(0);
      setPosition(nextPoint);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [positionKey]);

  useEffect(() => {
    if (!assetReady) return undefined;
    scheduleDialog(getNextDialogDelay());
    return () => {
      if (dialogTimerRef.current) window.clearTimeout(dialogTimerRef.current);
      if (hideDialogTimerRef.current) window.clearTimeout(hideDialogTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetReady, mode]);

  useEffect(() => {
    if (!assetReady) return undefined;
    const scheduleRoam = () => {
      if (roamTimerRef.current) window.clearTimeout(roamTimerRef.current);
      const min = mode === "dark" ? 150000 : 70000;
      const max = mode === "dark" ? 260000 : 140000;
      roamTimerRef.current = window.setTimeout(() => {
        const next = pickNextPosition(mode, positionKey);
        moveTo(next);
        scheduleRoam();
      }, randomBetween(min, max) * (isMobileViewport() ? 1.5 : 1));
    };
    scheduleRoam();
    return () => {
      if (roamTimerRef.current) window.clearTimeout(roamTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetReady, mode, moveTo, positionKey]);

  useEffect(() => {
    if (!assetReady) return undefined;
    const scheduleAction = () => {
      if (actionTimerRef.current) window.clearTimeout(actionTimerRef.current);
      const min = mode === "dark" ? 45000 : 28000;
      const max = mode === "dark" ? 60000 : 34000;
      actionTimerRef.current = window.setTimeout(() => {
        const pool: PetState[] = mode === "dark"
          ? ["waiting", "review", "curious-up"]
          : ["waving", "review", "running", "curious-up"];
        const nextAction = choose(pool, "review");
        runBriefMotion(nextAction, mode === "dark" ? randomBetween(7000, 11000) : randomBetween(6800, 9600));
        scheduleAction();
      }, randomBetween(min, max) * (isMobileViewport() ? 1.4 : 1));
    };
    scheduleAction();
    return () => {
      if (actionTimerRef.current) window.clearTimeout(actionTimerRef.current);
    };
  }, [assetReady, mode, runBriefMotion]);

  const spriteStyle = useMemo(
    () =>
      ({
        "--cola-row": meta.row,
        "--cola-frame": frame,
        backgroundImage: assetReady ? `url(${PET_ASSET})` : "none",
      } as React.CSSProperties),
    [assetReady, frame, meta.row]
  );

  const previousSpriteStyle = useMemo(
    () =>
      previousSprite
        ? ({
            "--cola-row": previousSprite.row,
            "--cola-frame": previousSprite.frame,
            backgroundImage: `url(${PET_ASSET})`,
          } as React.CSSProperties)
        : undefined,
    [previousSprite]
  );

  const petStyle = useMemo(
    () =>
      ({
        "--cola-x": `${Math.round(position.x)}px`,
        "--cola-y": `${Math.round(position.y)}px`,
        "--cola-move-ms": `${moveDuration}ms`,
      } as React.CSSProperties),
    [moveDuration, position.x, position.y]
  );

  const handStyle = useMemo(
    () =>
      ({
        "--cola-hand-x": `${Math.round(handPoint.x)}px`,
        "--cola-hand-y": `${Math.round(handPoint.y)}px`,
      } as React.CSSProperties),
    [handPoint.x, handPoint.y]
  );

  if (!assetReady) return null;

  return (
    <aside
      ref={petRef}
      className={`cola-pet cola-pet--${mode} cola-pet--${positionKey}`}
      style={petStyle}
      aria-label="可乐"
    >
      {dialog && (
        <div
          className={`cola-pet__bubble cola-pet__bubble--${dialog.kind} ${
            dialogVisible ? "cola-pet__bubble--visible" : ""
          }`}
          aria-live="polite"
          aria-atomic="true"
        >
          {dialog.text}
        </div>
      )}
      <button
        className={`cola-pet__button${handVisible ? " cola-pet__button--petting" : ""}`}
        type="button"
        onClick={moveAway}
        onMouseDown={hidePettingHand}
        onMouseEnter={showPettingHand}
        onMouseMove={updatePettingHand}
        onMouseLeave={hidePettingHand}
        onBlur={hidePettingHand}
        aria-label="摸摸可乐"
      >
        {previousSprite && previousSpriteStyle && (
          <span
            key={previousSprite.key}
            className="cola-pet__sprite cola-pet__sprite--previous"
            style={previousSpriteStyle}
            aria-hidden="true"
          />
        )}
        <span
          key={state}
          className="cola-pet__sprite cola-pet__sprite--current"
          style={spriteStyle}
          aria-hidden="true"
        />
        {handVisible && (
          <span className="cola-pet__petting-hand" style={handStyle} aria-hidden="true">
            <svg viewBox="0 0 48 48" focusable="false">
              <path
                d="M18.7 22.8V10.9c0-2.2 1.5-3.8 3.5-3.8s3.4 1.6 3.4 3.8v10.3V8.8c0-2.1 1.5-3.7 3.5-3.7s3.5 1.6 3.5 3.7v13.4V11.9c0-2 1.5-3.5 3.4-3.5 2 0 3.4 1.5 3.4 3.5v16.2c0 8.1-5.3 14.1-13.6 14.1h-1.9c-4.4 0-7.8-1.7-10.6-5.1l-5.7-6.9c-1.2-1.5-1-3.5.5-4.6 1.4-1 3.1-.8 4.4.4l4.6 4.3V13.5c0-2.1 1.5-3.7 3.4-3.7 2 0 3.5 1.6 3.5 3.7v9.3"
                fill="#fff3cf"
                stroke="#5f4730"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
              <path
                d="M17.1 30.3c2.9 2.4 5.4 3.4 9.6 3.4"
                fill="none"
                stroke="#c4874a"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
          </span>
        )}
      </button>
    </aside>
  );
};

export default ColaPet;
