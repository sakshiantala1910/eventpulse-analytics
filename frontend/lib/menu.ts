export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Starters' | 'Mains' | 'Desserts' | 'Drinks';
}

export const MENU: MenuItem[] = [
  { id: 'bruschetta', name: 'Bruschetta', description: 'Grilled bread, tomato, basil, olive oil.', price: 7.5, category: 'Starters' },
  { id: 'calamari', name: 'Crispy Calamari', description: 'Lightly fried, served with lemon aioli.', price: 9.5, category: 'Starters' },
  { id: 'margherita', name: 'Margherita Pizza', description: 'San Marzano tomato, mozzarella, basil.', price: 12.5, category: 'Mains' },
  { id: 'carbonara', name: 'Spaghetti Carbonara', description: 'Guanciale, pecorino, egg, black pepper.', price: 14, category: 'Mains' },
  { id: 'risotto', name: 'Mushroom Risotto', description: 'Arborio rice, wild mushrooms, parmesan.', price: 15.5, category: 'Mains' },
  { id: 'tiramisu', name: 'Tiramisu', description: 'Espresso-soaked ladyfingers, mascarpone.', price: 6.5, category: 'Desserts' },
  { id: 'panna-cotta', name: 'Panna Cotta', description: 'Vanilla bean, mixed berry coulis.', price: 6, category: 'Desserts' },
  { id: 'espresso', name: 'Espresso', description: 'Double shot.', price: 3, category: 'Drinks' },
  { id: 'house-red', name: 'House Red Wine', description: 'Glass of Sangiovese.', price: 8, category: 'Drinks' },
];

export function findMenuItem(id: string): MenuItem | undefined {
  return MENU.find((item) => item.id === id);
}
