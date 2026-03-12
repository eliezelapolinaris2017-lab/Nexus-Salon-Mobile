# Nexus Salón PWA

PWA mobile-first para barbería o salón con estética premium dark.

## Incluye
- Dashboard móvil
- Agenda diaria
- Registro de citas
- Cambio rápido de estado
- Firebase + Firestore
- Instalación tipo app con PWA

## Configuración rápida

1. Crea un proyecto en Firebase.
2. Activa Firestore.
3. Copia tus credenciales web en `firebase-config.js`.
4. Publica este repo en GitHub Pages.

## Reglas de Firestore para pruebas
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

## Siguiente fase
- clientes
- servicios editables
- login real
- comisiones
- recordatorios
