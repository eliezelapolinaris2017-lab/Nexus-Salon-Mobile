# Nuevo Nexus Salón PWA v2

Base visual premium mobile-first inspirada en una experiencia tipo SaaS elegante.

## Lo que incluye
- Acceso por PIN demo
- Dashboard premium
- Agenda del día
- Alta de citas
- Clientes resumidos
- Servicios base
- Firebase listo
- PWA instalable

## PIN demo
`2026`

## Cómo conectar Firebase
1. Crea/abre tu proyecto en Firebase.
2. Activa Firestore.
3. Pega las credenciales web reales en `firebase-config.js`.
4. Publica en GitHub Pages.

## Reglas de prueba para Firestore
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /appointments/{docId} {
      allow read, write: if true;
    }
  }
}
```

## Próxima fase
- logo real final
- CRUD de clientes y servicios
- comisiones por barbero
- login real
- branding más pulido
