
import { createClient } from '@supabase/supabase-js';
import { StockItem, Transaction, MenuPlan, Procurement, Distribution, User, Volunteer } from '../types';

/**
 * 🛠️ SQL SETUP - JALANKAN DI SUPABASE SQL EDITOR:
 * 
 * CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT, "fullName" TEXT, role TEXT, permissions JSONB);
 * CREATE TABLE IF NOT EXISTS stock (id TEXT PRIMARY KEY, name TEXT, category TEXT, "itemType" TEXT, quantity NUMERIC, unit TEXT, "minThreshold" NUMERIC, "lastUpdated" TEXT);
 * CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, "itemId" TEXT, "itemName" TEXT, type TEXT, quantity NUMERIC, date TEXT, notes TEXT, "performedBy" TEXT);
 * CREATE TABLE IF NOT EXISTS menu_plans (id TEXT PRIMARY KEY, date TEXT, name TEXT, portions NUMERIC, ingredients JSONB, "createdAt" TEXT, "performedBy" TEXT);
 * CREATE TABLE IF NOT EXISTS procurements (id TEXT PRIMARY KEY, date TEXT, supplier TEXT, items JSONB, status TEXT, "totalPrice" NUMERIC, "sourceMenuId" TEXT, "photoUrl" TEXT, "invoicePhotoUrl" TEXT, "performedBy" TEXT);
 * CREATE TABLE IF NOT EXISTS distributions (id TEXT PRIMARY KEY, destination TEXT, "recipientName" TEXT, "driverName" TEXT, portions NUMERIC, status TEXT, timestamp TEXT, "sentAt" TEXT, "deliveredAt" TEXT, "pickupStartedAt" TEXT, "pickedUpAt" TEXT, "photoUrl" TEXT, "pickedUpCount" NUMERIC, location JSONB, "performedBy" TEXT);
 * CREATE TABLE IF NOT EXISTS volunteers (id TEXT PRIMARY KEY, name TEXT, division TEXT, phone TEXT, status TEXT, "joinedAt" TEXT);
 * 
 * -- MATIKAN RLS (Untuk Testing)
 * ALTER TABLE users DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE stock DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE menu_plans DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE procurements DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE distributions DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE volunteers DISABLE ROW LEVEL SECURITY;
 */

const SUPABASE_URL = 'https://nwkdrdpeiahdkpqskfvx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2RyZHBlaWFoZGtwcXNrZnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MjMwOTcsImV4cCI6MjA4MzI5OTA5N30.46eL4-6W7Qt6Gq3kc5jdy7ESBJwXODAIII4hgL9JYIs';

const isConfigured = SUPABASE_URL.includes('.supabase.co') && SUPABASE_ANON_KEY.length > 20;

export const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const supabaseService = {
  isConfigured: () => isConfigured,

  async testConnection() {
    if (!supabase) return { success: false, message: 'Kredensial belum dikonfigurasi' };
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      if (error && error.code !== '42P01') throw error;
      return { success: true, message: 'Koneksi Berhasil' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async fetchAll() {
    if (!supabase) return null;
    const tables = ['stock', 'transactions', 'menu_plans', 'procurements', 'distributions', 'users', 'volunteers'];
    try {
      const results = await Promise.all(tables.map(t => supabase!.from(t).select('*')));
      
      return {
        stock: results[0].data || [],
        transactions: results[1].data || [],
        menuPlans: results[2].data || [],
        procurements: results[3].data || [],
        distributions: results[4].data || [],
        users: results[5].data || [],
        volunteers: results[6].data || []
      };
    } catch (error: any) {
      console.warn("Gagal fetch data (Mungkin masalah jaringan): ", error.message);
      return null;
    }
  },

  async upsertData(table: string, data: any[]) {
    if (!supabase || !data || data.length === 0) return;
    try {
      const { error } = await supabase.from(table).upsert(data, { onConflict: 'id' });
      if (error) throw error;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.warn(`Sinkronisasi Cloud Tertunda [${table}]: Offline atau Masalah Jaringan.`);
      } else {
        console.error(`Sinkronisasi Gagal [${table}]:`, error.message);
      }
      if (error.code === '42P01') {
        console.error(`TIPS: Pastikan tabel '${table}' sudah dibuat di Database Supabase.`);
      }
    }
  },

  async deleteRow(table: string, id: string) {
    if (!supabase) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
         console.warn(`Penghapusan Cloud Tertunda [${table}]: Offline.`);
      } else {
         console.error(`Gagal menghapus row di [${table}]:`, error.message);
      }
    }
  }
};
