
export interface StockItem {
  id: string;
  name: string;
  category: string;
  itemType: 'BAHAN' | 'ALAT';
  quantity: number;
  unit: string;
  minThreshold: number;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  notes: string;
  performedBy?: string;
}

export interface MenuPlan {
  id: string;
  date: string;
  name: string;
  portions: number;
  ingredients: { name: string; quantity: number; unit: string }[];
  createdAt: string;
  performedBy?: string;
}

export interface Procurement {
  id: string;
  date: string;
  supplier: string;
  items: { name: string; quantity: number; price: number; unit?: string }[];
  status: 'PENDING' | 'ORDERED' | 'RECEIVED';
  fundingSource?: 'OPERASIONAL' | 'YAYASAN';
  totalPrice: number;
  sourceMenuId?: string;
  photoUrl?: string;
  invoicePhotoUrl?: string;
  performedBy?: string;
}

export interface Distribution {
  id: string;
  serialNumber?: string; // Sequential delivery note number
  destination: string;
  recipientName: string;
  driverName?: string;
  pickupDriverName?: string; // Added field for pickup personnel
  portions: number;
  status: 'PREPARING' | 'ON_DELIVERY' | 'DELIVERED' | 'PICKING_UP' | 'PICKED_UP';
  timestamp: string;
  sentAt?: string;
  deliveredAt?: string;
  pickupStartedAt?: string;
  pickedUpAt?: string;
  photoUrl?: string;
  pickedUpCount?: number;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  performedBy?: string;
}

export type UserRole = 'ADMIN' | 'AKUNTAN' | 'KA_SPPG' | 'AHLI_GIZI' | 'ADMIN_GUDANG' | 'MITRA' | 'RELAWAN';

export type UserPermission = 
  | 'CAN_RECEIVE'      // Menerima barang
  | 'CAN_ORDER'        // Membuat pesanan
  | 'CAN_DISTRIBUTE'   // Mengatur distribusi
  | 'CAN_MANAGE_STOCK' // Mengubah stok
  | 'CAN_CREATE_MENU'; // Membuat menu

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: UserRole;
  permissions: UserPermission[];
}

export type VolunteerDivision = 
  | 'CUCI_OMPRENG'
  | 'PENGOLAHAN'
  | 'KEAMANAN'
  | 'KEBERSIHAN'
  | 'PERSIAPAN'
  | 'PACKING'
  | 'DISTRIBUSI'
  | 'PURCHASING';

export interface Volunteer {
  id: string;
  name: string;
  division: VolunteerDivision;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  joinedAt: string;
  isCoordinator?: boolean;
  userId?: string; // Linked account ID
}

export type ViewState = 'dashboard' | 'inventory' | 'menu' | 'procurement' | 'distribution' | 'user-management' | 'volunteers';
