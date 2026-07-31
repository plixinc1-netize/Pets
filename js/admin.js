import {
  db,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "./firebase-config.js";

const baseUrlInput = document.getElementById("baseUrl");
const codigoInput = document.getElementById("codigoInput");
const btnRandom = document.getElementById("btnRandom");
const btnCrear = document.getElementById("btnCrear");
const adminMsg = document.getElementById("adminMsg");
const resultBox = document.getElementById("resultBox");
const resultCode = document.getElementById("resultCode");
const resultUrl = document.getElementById("resultUrl");
const btnCopy = document.getElementById("btnCopy");
const ledger = document.getElementById("ledger");

// Detecta automáticamente la URL base (la carpeta donde vive index.html),
// asumiendo que admin.html e index.html están en la misma carpeta.
// Se usa la carpeta sola (sin "index.html" al final) porque GitHub Pages
// sirve index.html automáticamente en la raíz de la carpeta.
function detectarBaseUrl() {
  const { origin, pathname } = window.location;
  const ultimaBarra = pathname.lastIndexOf("/");
  const carpeta = ultimaBarra >= 0 ? pathname.substring(0, ultimaBarra + 1) : "/";
  return origin + carpeta;
}
baseUrlInput.value = detectarBaseUrl();

function generarCodigoAleatorio() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para evitar confusiones al transcribir
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

btnRandom.addEventListener("click", () => {
  codigoInput.value = generarCodigoAleatorio();
});

function mostrarMensaje(texto, tipo) {
  adminMsg.innerHTML = `<div class="status-msg ${tipo}">${texto}</div>`;
}

function construirUrl(base, codigo) {
  const separador = base.includes("?") ? "&" : "?";
  return `${base}${separador}codigo=${encodeURIComponent(codigo)}`;
}

btnCrear.addEventListener("click", async () => {
  const codigo = codigoInput.value.trim().toUpperCase();
  const base = baseUrlInput.value.trim();

  if (!codigo) {
    mostrarMensaje("Escribe o genera un código primero.", "error");
    return;
  }
  if (!/^[A-Z0-9-]+$/.test(codigo)) {
    mostrarMensaje("El código solo puede tener letras, números y guiones, sin espacios.", "error");
    return;
  }
  if (!base) {
    mostrarMensaje("Falta la URL base del sitio.", "error");
    return;
  }

  btnCrear.disabled = true;
  mostrarMensaje('<span class="spinner"></span> Verificando y creando…', "info");

  try {
    const llenadoRef = doc(db, codigo, "llenado");
    const existente = await getDoc(llenadoRef);

    if (existente.exists()) {
      mostrarMensaje(
        `El código "${codigo}" ya existe. Usa otro para no pisar una placa ya creada.`,
        "error"
      );
      btnCrear.disabled = false;
      return;
    }

    // Crea el documento "llenado" con la bandera en false.
    await setDoc(llenadoRef, { yaselleno: false });

    const url = construirUrl(base, codigo);

    // Registro auxiliar para poder listar las placas generadas en este panel.
    await setDoc(doc(db, "registro_codigos", codigo), {
      codigo,
      url,
      creado: serverTimestamp(),
    });

    resultCode.textContent = codigo;
    resultUrl.textContent = url;
    resultBox.style.display = "block";

    mostrarMensaje(`Placa "${codigo}" creada correctamente.`, "success");
    codigoInput.value = "";
    cargarRegistro();
  } catch (err) {
    console.error(err);
    mostrarMensaje("Ocurrió un error al crear la placa: " + err.message, "error");
  } finally {
    btnCrear.disabled = false;
  }
});

btnCopy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultUrl.textContent);
    btnCopy.textContent = "¡Copiado!";
    setTimeout(() => (btnCopy.textContent = "Copiar"), 1500);
  } catch {
    mostrarMensaje("No se pudo copiar automáticamente, copia el texto manualmente.", "error");
  }
});

async function cargarRegistro() {
  try {
    const q = query(collection(db, "registro_codigos"), orderBy("creado", "desc"), limit(50));
    const snap = await getDocs(q);

    if (snap.empty) {
      ledger.innerHTML = '<div class="center">Todavía no has generado ninguna placa.</div>';
      return;
    }

    let html = "";
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      html += `
        <div class="ledger-item">
          <span class="code-chip">${d.codigo}</span>
          <span class="url-text" title="${d.url}">${d.url}</span>
          <button type="button" class="btn-secondary copy-row" data-url="${d.url}" style="flex:0 0 auto">Copiar</button>
        </div>`;
    });
    ledger.innerHTML = html;

    ledger.querySelectorAll(".copy-row").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await navigator.clipboard.writeText(btn.dataset.url);
        btn.textContent = "¡Copiado!";
        setTimeout(() => (btn.textContent = "Copiar"), 1500);
      });
    });
  } catch (err) {
    console.error(err);
    ledger.innerHTML = `<div class="status-msg error">No se pudo cargar el registro: ${err.message}</div>`;
  }
}

cargarRegistro();
