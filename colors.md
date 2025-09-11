# Codes Couleurs du Projet

## Palette de couleurs principales (Tailwind Config)

### Couleurs de marque
- **brand-dark**: `#3c3533` - Brun foncé principal
- **brand-light**: `#d2c8c3` - Beige clair
- **brand-neutral**: `#e8d8c9` - Beige neutre
- **brand-green**: `#2e7d6f` - Vert (non utilisé actuellement)
- **brand-white**: `#ffffff` - Blanc pur
- **brand-accent**: `#c19a5f` - Doré/Bronze (couleur d'accent principale)

### Couleurs de texte
- **brand-text-dark**: `#000000` - Noir pour texte principal
- **brand-text-light**: `#e0e0e0` - Gris clair pour texte sur fond sombre

## Couleurs Tailwind utilisées

### Couleurs grises
- `gray-100` - Arrière-plans très clairs
- `gray-500` - Texte secondaire
- `gray-600` - Texte sur fond clair
- `gray-700` - Texte plus foncé

### Couleurs système
- `white` - Blanc pur
- `black` - Noir pur

## Couleurs avec opacité

### Arrière-plans avec transparence
- `bg-brand-dark bg-opacity-95` - Fond sombre à 95% d'opacité
- `bg-brand-light bg-opacity-10` - Fond clair à 10% d'opacité
- `bg-brand-light bg-opacity-30` - Fond clair à 30% d'opacité
- `bg-brand-light bg-opacity-50` - Fond clair à 50% d'opacité

### Bordures avec transparence
- `border-brand-accent border-opacity-30` - Bordure accent à 30% d'opacité
- `border-brand-accent border-opacity-50` - Bordure accent à 50% d'opacité

## Couleurs dans les animations CSS

### Animation rotate-bicolor
```css
background: conic-gradient(from 0deg, #c19a5f 0deg, #c19a5f 120deg, #3c3533 120deg, #3c3533 240deg, #c19a5f 240deg, #c19a5f 360deg)
```

### Animation glow (keyframes)
- `rgba(193, 154, 95, 0.5)` - Lueur à 50% d'opacité
- `rgba(193, 154, 95, 0.8)` - Lueur à 80% d'opacité  
- `rgba(193, 154, 95, 0.6)` - Lueur à 60% d'opacité

## Utilisation par section

### Header/Navigation
- Fond: `brand-dark` (#3c3533)
- Texte: `brand-white` (#ffffff)
- Hover: `brand-accent` (#c19a5f)

### Sections principales
- Fond sombre: `brand-dark` (#3c3533)
- Fond clair: `brand-light` (#d2c8c3)
- Cartes: `brand-white` (#ffffff) ou `brand-neutral` (#e8d8c9)

### Boutons et CTA
- Principal: `brand-accent` (#c19a5f)
- Texte: `white` (#ffffff)
- Hover: `brand-accent` avec `bg-opacity-90`

### Footer
- Fond: `brand-dark` (#3c3533)
- Texte: `brand-white` (#ffffff) et `brand-text-light` (#e0e0e0)
- Liens hover: `brand-accent` (#c19a5f)