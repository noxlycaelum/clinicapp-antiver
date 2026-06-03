import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE_PATH = path.join(__dirname, 'database.json');

export class DBManager {
  static async init() {
    try {
      await fs.mkdir(__dirname, { recursive: true });
      try {
        await fs.access(DB_FILE_PATH);
      } catch {
        // File does not exist, create it with empty shell
        await DBManager.write({
          users: [],
          patients: [],
          appointments: [],
          billing: [],
          workflows: [],
          whatsapp_logs: []
        });
        console.log('Database file created successfully.');
      }
    } catch (err) {
      console.error('Error initializing database:', err);
    }
  }

  static async read() {
    try {
      const data = await fs.readFile(DB_FILE_PATH, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading database, resetting to empty schema:', err);
      const emptySchema = {
        users: [],
        patients: [],
        appointments: [],
        billing: [],
        workflows: [],
        whatsapp_logs: []
      };
      await DBManager.write(emptySchema);
      return emptySchema;
    }
  }

  static async write(data) {
    try {
      // Write with pretty printing for easier debugging/inspection by the developer
      await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing to database:', err);
      throw err;
    }
  }

  // Get a specific collection
  static async getCollection(name) {
    const db = await DBManager.read();
    return db[name] || [];
  }

  // Save a collection
  static async saveCollection(name, collectionData) {
    const db = await DBManager.read();
    db[name] = collectionData;
    await DBManager.write(db);
    return collectionData;
  }

  // Add an item to a collection
  static async insertItem(collectionName, item) {
    const db = await DBManager.read();
    if (!db[collectionName]) db[collectionName] = [];
    
    // Auto-generate string ID if not present
    if (!item.id) {
      item.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }
    item.createdAt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    
    db[collectionName].push(item);
    await DBManager.write(db);
    return item;
  }

  // Update an item in a collection
  static async updateItem(collectionName, itemId, updateData) {
    const db = await DBManager.read();
    const collection = db[collectionName] || [];
    const index = collection.findIndex(i => i.id === itemId);
    
    if (index === -1) {
      throw new Error(`Item with ID ${itemId} not found in collection ${collectionName}`);
    }
    
    collection[index] = {
      ...collection[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    db[collectionName] = collection;
    await DBManager.write(db);
    return collection[index];
  }

  // Delete an item from a collection
  static async deleteItem(collectionName, itemId) {
    const db = await DBManager.read();
    const collection = db[collectionName] || [];
    const index = collection.findIndex(i => i.id === itemId);
    
    if (index === -1) {
      throw new Error(`Item with ID ${itemId} not found in collection ${collectionName}`);
    }
    
    const deletedItem = collection.splice(index, 1)[0];
    db[collectionName] = collection;
    await DBManager.write(db);
    return deletedItem;
  }
}
