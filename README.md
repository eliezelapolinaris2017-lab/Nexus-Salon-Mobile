# Nuevo Nexus Salón PWA v3

Versión más premium, más oscura y con Firebase ya configurado.

## Incluye
- PIN de acceso demo
- Dashboard premium black
- Agenda del día
- Alta de citas
- Clientes resumidos
- Servicios base
- Firebase conectado al proyecto `nexus-barber-shop`
- PWA instalable

## PIN demo
`2026`

## Importante para Firestore
Si al abrir ves error de lectura/escritura, casi seguro necesitas una de estas dos cosas:

### 1) Reglas temporales para pruebas
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

### 2) Índice compuesto
La app consulta:
- `orderBy('date', 'asc')`
- `orderBy('time', 'asc')`

Si Firestore lo pide, crea ese índice compuesto en la consola.

## Siguiente sprint
- CRUD completo
- edición real de clientes y servicios
- comisiones por barbero
- logo final y branding más fino
