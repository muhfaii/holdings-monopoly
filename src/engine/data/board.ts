import type { Square, ColorGroup } from '../core/state';

/**
 * Rent ladders: [base, monopoly, 1-house, 2-houses, 3-houses, 4-houses, hotel]
 * Values transposed from classic Monopoly by tier.
 */
const rentLadders: Record<ColorGroup, Record<number, number[]>> = {
  brown: {
    60: [2, 4, 10, 30, 90, 160, 250],
  },
  'light-blue': {
    100: [6, 12, 30, 90, 270, 400, 550],
    120: [8, 16, 40, 100, 300, 450, 600],
  },
  pink: {
    140: [10, 20, 50, 150, 450, 625, 750],
    160: [12, 24, 60, 180, 500, 700, 900],
  },
  orange: {
    180: [14, 28, 70, 200, 550, 750, 950],
    200: [16, 32, 80, 220, 600, 800, 1000],
  },
  red: {
    220: [18, 36, 90, 250, 700, 875, 1050],
    240: [20, 40, 100, 300, 750, 925, 1100],
  },
  yellow: {
    260: [22, 44, 110, 330, 800, 975, 1150],
    280: [24, 48, 120, 360, 850, 1025, 1200],
  },
  green: {
    300: [26, 52, 130, 390, 900, 1100, 1275],
    320: [28, 56, 150, 450, 1000, 1200, 1400],
  },
  'dark-blue': {
    350: [35, 70, 175, 500, 1100, 1300, 1500],
    400: [50, 100, 200, 600, 1400, 1700, 2000],
  },
};

function rentLadder(group: ColorGroup, price: number): number[] {
  const ladder = rentLadders[group]?.[price];
  if (!ladder) throw new Error(`No rent ladder for ${group} at $${price}`);
  return ladder;
}

export const RAILROAD_RENT = [25, 50, 100, 200];

export const BOARD: Square[] = [
  // ── Top row (left to right) ──
  { id: 0, name: 'GO', type: 'go', price: 0 },
  { id: 1, name: 'Kampung Baru', type: 'property', price: 60, group: 'brown', rentLadder: rentLadder('brown', 60), houseCost: 50 },
  { id: 2, name: 'Community Chest', type: 'community-chest', price: 0 },
  { id: 3, name: 'Chow Kit', type: 'property', price: 60, group: 'brown', rentLadder: rentLadder('brown', 60), houseCost: 50 },
  { id: 4, name: 'LHDN Tax', type: 'tax', price: 200 },
  { id: 5, name: 'KL Sentral', type: 'railroad', price: 200, rentLadder: RAILROAD_RENT },
  { id: 6, name: 'Wangsa Maju', type: 'property', price: 100, group: 'light-blue', rentLadder: rentLadder('light-blue', 100), houseCost: 50 },
  { id: 7, name: 'Chance', type: 'chance', price: 0 },
  { id: 8, name: 'Pudu', type: 'property', price: 100, group: 'light-blue', rentLadder: rentLadder('light-blue', 100), houseCost: 50 },
  { id: 9, name: 'Cheras', type: 'property', price: 120, group: 'light-blue', rentLadder: rentLadder('light-blue', 120), houseCost: 50 },
  { id: 10, name: 'Jail / Just Visiting', type: 'jail', price: 0 },

  // ── Left column (bottom to top) ──
  { id: 11, name: 'Old Klang Road', type: 'property', price: 140, group: 'pink', rentLadder: rentLadder('pink', 140), houseCost: 100 },
  { id: 12, name: 'Tenaga Nasional', type: 'utility', price: 150, rentLadder: [0, 0] },
  { id: 13, name: 'Kepong', type: 'property', price: 140, group: 'pink', rentLadder: rentLadder('pink', 140), houseCost: 100 },
  { id: 14, name: 'Bukit Jalil', type: 'property', price: 160, group: 'pink', rentLadder: rentLadder('pink', 160), houseCost: 100 },
  { id: 15, name: 'TBS', type: 'railroad', price: 200, rentLadder: RAILROAD_RENT },
  { id: 16, name: 'Brickfields', type: 'property', price: 180, group: 'orange', rentLadder: rentLadder('orange', 180), houseCost: 100 },
  { id: 17, name: 'Community Chest', type: 'community-chest', price: 0 },
  { id: 18, name: 'Chinatown', type: 'property', price: 180, group: 'orange', rentLadder: rentLadder('orange', 180), houseCost: 100 },
  { id: 19, name: 'Bukit Bintang', type: 'property', price: 200, group: 'orange', rentLadder: rentLadder('orange', 200), houseCost: 100 },
  { id: 20, name: 'Kopitiam', type: 'kopitiam', price: 0 },

  // ── Bottom row (right to left) ──
  { id: 21, name: 'Bangsar South', type: 'property', price: 220, group: 'red', rentLadder: rentLadder('red', 220), houseCost: 150 },
  { id: 22, name: 'Chance', type: 'chance', price: 0 },
  { id: 23, name: 'TRX', type: 'property', price: 220, group: 'red', rentLadder: rentLadder('red', 220), houseCost: 150 },
  { id: 24, name: 'Mid Valley', type: 'property', price: 240, group: 'red', rentLadder: rentLadder('red', 240), houseCost: 150 },
  { id: 25, name: 'Masjid Jamek', type: 'railroad', price: 200, rentLadder: RAILROAD_RENT },
  { id: 26, name: 'Mont Kiara', type: 'property', price: 260, group: 'yellow', rentLadder: rentLadder('yellow', 260), houseCost: 150 },
  { id: 27, name: 'TTDI', type: 'property', price: 260, group: 'yellow', rentLadder: rentLadder('yellow', 260), houseCost: 150 },
  { id: 28, name: 'Petronas', type: 'utility', price: 150, rentLadder: [0, 0] },
  { id: 29, name: 'UM', type: 'property', price: 280, group: 'yellow', rentLadder: rentLadder('yellow', 280), houseCost: 150 },
  { id: 30, name: 'Go to Jail', type: 'go-to-jail', price: 0 },

  // ── Right column (top to bottom) ──
  { id: 31, name: 'Bangsar', type: 'property', price: 300, group: 'green', rentLadder: rentLadder('green', 300), houseCost: 200 },
  { id: 32, name: 'Pusat Bandar Damansara', type: 'property', price: 300, group: 'green', rentLadder: rentLadder('green', 300), houseCost: 200 },
  { id: 33, name: 'Community Chest', type: 'community-chest', price: 0 },
  { id: 34, name: 'Ampang Hilir', type: 'property', price: 320, group: 'green', rentLadder: rentLadder('green', 320), houseCost: 200 },
  { id: 35, name: 'Awan Besar', type: 'railroad', price: 200, rentLadder: RAILROAD_RENT },
  { id: 36, name: 'Chance', type: 'chance', price: 0 },
  { id: 37, name: 'Bukit Tunku', type: 'property', price: 350, group: 'dark-blue', rentLadder: rentLadder('dark-blue', 350), houseCost: 200 },
  { id: 38, name: 'Cukai Mewah', type: 'tax', price: 100 },
  { id: 39, name: 'KLCC', type: 'property', price: 400, group: 'dark-blue', rentLadder: rentLadder('dark-blue', 400), houseCost: 200 },
];

export const BOARD_SIZE = BOARD.length;
export const GO_SALARY = 200;
export const STARTING_CASH = 1500;
export const JAIL_FINE = 50;
export const JAIL_SQUARE = 10;
export const GO_TO_JAIL_SQUARE = 30;
export const KOPITIAM_SQUARE = 20;
export const MAX_HOUSES = 5; // 5 = hotel
export const HOUSE_SUPPLY = 32;
export const HOTEL_SUPPLY = 12;
