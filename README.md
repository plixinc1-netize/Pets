# Placas NFC para mascotas

Proyecto con dos páginas:

- **`admin.html`** — genera un código único por placa, crea el registro en
  Firebase y te da la URL exacta para grabar en el chip NFC.
- **`index.html`** — la página que abre el celular al leer el chip. Si la
  placa no tiene datos, muestra el formulario de llenado. Si ya tiene datos,
  los muestra en modo lectura con un botón de editar (protegido por
  contraseña).

## Estructura en Firebase

Para un código `A1B2C3`:

```
Firestore
 └── A1B2C3               (colección = el código)
      ├── llenado          (documento) → { yaselleno: false | true }
      └── datos            (documento) → tipoAnimal, nombre, raza,
                                          metodoEdad, fechaAdopcion /
                                          anoNacimiento, telefonoDueno,
                                          correoDueno, contrasenaModificacion,
                                          fotoURL
 └── registro_codigos      (colección auxiliar solo para el panel admin)
      └── A1B2C3            → { codigo, url, creado }

Storage
 └── A1B2C3/foto           (una sola imagen, se sobrescribe al editar)
```

> Nota: pediste que `yaselleno` fuera `double`. Lo implementé como
> **booleano** (`true`/`false`), que es el tipo correcto de Firestore para
> una bandera de sí/no — el comportamiento es idéntico a lo que describiste.

## 1. Configurar Firebase (una sola vez)

1. En la [consola de Firebase](https://console.firebase.google.com/), abre el
   proyecto `frame-9bd7a`.
2. **Firestore Database** → si no existe, créala en modo producción
   (cualquier región).
3. **Storage** → actívalo también si no está activo.
4. Ve a la pestaña **Reglas** de Firestore y pega el contenido de
   `firestore.rules` de este proyecto. Haz lo mismo en Storage con
   `storage.rules`.

⚠️ **Nota de seguridad honesta:** como no se pidió usar Firebase
Authentication, las reglas de este ejemplo dejan lectura/escritura abierta
para que el sitio funcione sin login. Esto significa que la contraseña de
modificación se guarda como texto plano en el documento `datos`, y alguien
con conocimientos técnicos podría leerla directo desde Firestore sin pasar
por el formulario. Sirve como control anti-error para el uso normal (evita
que cualquiera edite la placa desde la página), pero no es seguridad de
verdad. Si más adelante quieres cerrarlo mejor, la mejora natural es mover la
verificación de contraseña a una Cloud Function.

## 2. Desplegar el sitio (ahora en Vercel)

El proyecto no necesita build ni configuración especial: son archivos
estáticos (`index.html`, `admin.html`, `css/`, `js/`). Basta con:

1. Subir el contenido de esta carpeta a un repositorio de GitHub.
2. En Vercel, importar ese repositorio como proyecto (sin framework /
   "Other"), dejando la raíz del repo como raíz del sitio.
3. Vercel te da una URL, en este caso:
   `https://pets-pi-ten.vercel.app/`.

Cuando tengas esa URL, entra a `https://pets-pi-ten.vercel.app/admin.html`:
el campo "URL base" se autocompleta con
`https://pets-pi-ten.vercel.app/`. Si por algo la detecta mal,
puedes escribirla a mano (debe terminar en "/").

> También funciona igual en GitHub Pages si en algún momento vuelves a esa
> opción: el panel admin detecta la URL base sola sin importar el hosting.

## 3. Generar una placa y grabar el chip NFC

1. En `admin.html`, escribe un código o dale a **Generar aleatorio**.
2. Presiona **Crear placa y generar URL** → esto crea `llenado.yaselleno =
   false` en Firestore y te muestra la URL final, algo como:
   `https://pets-pi-ten.vercel.app/?codigo=A1B2C3`
3. Copia esa URL.
4. Con una app como **NFC Tools** (Android/iOS), escribe esa URL como
   registro tipo "URL/URI" en el chip NFC.
5. Pega el chip en la placa impresa en 3D.

## 4. Uso por el dueño de la mascota

1. Acerca el celular al chip → abre `https://pets-pi-ten.vercel.app/?codigo=A1B2C3`.
2. Si es la primera vez, llena el formulario (la única casilla obligatoria es
   la contraseña de modificación) y confirma.
3. La foto se sube a `Storage/A1B2C3/foto` y los datos a
   `Firestore/A1B2C3/datos`; al final se marca `yaselleno = true`.
4. En visitas futuras, la página muestra los datos guardados directamente.
   El icono de lápiz (✎) pide la contraseña y abre un formulario de edición
   (la foto nueva sobrescribe la anterior en la misma ruta).

## Archivos del proyecto

```
index.html          página principal (formulario / vista)
admin.html           panel para generar placas
css/style.css        estilos compartidos
js/firebase-config.js  inicialización de Firebase (Firestore + Storage)
js/app.js             lógica de index.html
js/admin.js           lógica de admin.html
firestore.rules       reglas de ejemplo para Firestore
storage.rules         reglas de ejemplo para Storage
```
