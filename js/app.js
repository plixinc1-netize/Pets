import {
  db,
  storage,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  ref,
  uploadBytes,
  getDownloadURL,
} from "./firebase-config.js";

// ---------- Utilidades generales ----------

function getCodigo() {
  const params = new URLSearchParams(window.location.search);
  const c = params.get("codigo");
  return c ? c.trim() : null;
}

function show(el) {
  el.style.display = "";
}
function hide(el) {
  el.style.display = "none";
}

function mostrarError(html) {
  hide(document.getElementById("loadingState"));
  const box = document.getElementById("errorState");
  box.innerHTML = `<div class="status-msg error">${html}</div>`;
  show(box);
}

function calcularEdadDesdeAno(anoNacimiento) {
  const ahora = new Date();
  let edad = ahora.getFullYear() - anoNacimiento;
  return edad;
}

function calcularTiempoDesdeFecha(fechaISO) {
  const inicio = new Date(fechaISO);
  const ahora = new Date();
  let anos = ahora.getFullYear() - inicio.getFullYear();
  const m = ahora.getMonth() - inicio.getMonth();
  if (m < 0 || (m === 0 && ahora.getDate() < inicio.getDate())) anos--;
  if (anos <= 0) {
    const meses = Math.max(
      1,
      (ahora.getFullYear() - inicio.getFullYear()) * 12 + (ahora.getMonth() - inicio.getMonth())
    );
    return `${meses} mes${meses === 1 ? "" : "es"}`;
  }
  return `${anos} año${anos === 1 ? "" : "s"}`;
}

// ---------- Arranque ----------

const codigo = getCodigo();
const loadingState = document.getElementById("loadingState");
const formState = document.getElementById("formState");
const viewState = document.getElementById("viewState");
const codigoEyebrow = document.getElementById("codigoEyebrow");

let datosActuales = null; // en memoria, incluye la contraseña para poder validarla al editar

init();

async function init() {
  if (!codigo) {
    mostrarError(
      "Falta el código de la placa en la URL (parámetro <span class='mono'>codigo</span>). Verifica el enlace grabado en el chip NFC."
    );
    return;
  }
  codigoEyebrow.textContent = `Placa ${codigo}`;

  try {
    const llenadoSnap = await getDoc(doc(db, codigo, "llenado"));

    if (!llenadoSnap.exists()) {
      mostrarError(
        `El código <span class="mono">${codigo}</span> no está registrado todavía. Pide al administrador que genere esta placa antes de usarla.`
      );
      return;
    }

    const yaselleno = !!llenadoSnap.data().yaselleno;
    hide(loadingState);

    if (!yaselleno) {
      show(formState);
      initFormulario();
    } else {
      const datosSnap = await getDoc(doc(db, codigo, "datos"));
      datosActuales = datosSnap.exists() ? datosSnap.data() : {};
      show(viewState);
      renderVista();
      initEdicion();
    }
  } catch (err) {
    console.error(err);
    mostrarError("No se pudo conectar con la base de datos: " + err.message);
  }
}

// ---------- Formulario de primer llenado ----------

function initFormulario() {
  const tipoAnimal = document.getElementById("tipoAnimal");
  const tipoOtroWrap = document.getElementById("tipoOtroWrap");
  const conoceNacimiento = document.getElementById("conoceNacimiento");
  const fechaAdopcionWrap = document.getElementById("fechaAdopcionWrap");
  const anoNacimientoWrap = document.getElementById("anoNacimientoWrap");
  const form = document.getElementById("petForm");
  const formMsg = document.getElementById("formMsg");

  tipoAnimal.addEventListener("change", () => {
    tipoOtroWrap.style.display = tipoAnimal.value === "__otro__" ? "" : "none";
  });

  conoceNacimiento.addEventListener("change", () => {
    if (conoceNacimiento.checked) {
      hide(fechaAdopcionWrap);
      show(anoNacimientoWrap);
    } else {
      show(fechaAdopcionWrap);
      hide(anoNacimientoWrap);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formMsg.innerHTML = "";

    const contrasena = document.getElementById("contrasena").value;
    const contrasenaConfirm = document.getElementById("contrasenaConfirm").value;

    if (!contrasena || contrasena.length < 4) {
      formMsg.innerHTML = '<div class="status-msg error">La contraseña de modificación es obligatoria (mínimo 4 caracteres).</div>';
      return;
    }
    if (contrasena !== contrasenaConfirm) {
      formMsg.innerHTML = '<div class="status-msg error">Las contraseñas no coinciden.</div>';
      return;
    }

    const tipoSel = tipoAnimal.value;
    const tipoFinal = tipoSel === "__otro__" ? document.getElementById("tipoOtro").value.trim() : tipoSel;

    const datos = {
      tipoAnimal: tipoFinal || "",
      nombre: document.getElementById("nombre").value.trim(),
      raza: document.getElementById("raza").value.trim(),
      telefonoDueno: document.getElementById("telefonoDueno").value.trim(),
      correoDueno: document.getElementById("correoDueno").value.trim(),
      contrasenaModificacion: contrasena,
      metodoEdad: conoceNacimiento.checked ? "nacimiento" : "adopcion",
      fechaAdopcion: conoceNacimiento.checked ? "" : document.getElementById("fechaAdopcion").value,
      anoNacimiento: conoceNacimiento.checked
        ? Number(document.getElementById("anoNacimiento").value) || null
        : null,
      fotoURL: "",
    };

    if (!confirm("¿Estás seguro de guardar estos datos? Podrás modificarlos después con tu contraseña.")) {
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    formMsg.innerHTML = '<div class="status-msg info"><span class="spinner"></span> Guardando…</div>';

    try {
      const archivo = document.getElementById("foto").files[0];
      if (archivo) {
        const fotoRef = ref(storage, `${codigo}/foto`);
        await uploadBytes(fotoRef, archivo, { contentType: archivo.type });
        datos.fotoURL = await getDownloadURL(fotoRef);
      }

      await setDoc(doc(db, codigo, "datos"), datos);
      await updateDoc(doc(db, codigo, "llenado"), { yaselleno: true });

      formMsg.innerHTML = '<div class="status-msg success">¡Datos guardados! Recargando…</div>';
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      console.error(err);
      formMsg.innerHTML = `<div class="status-msg error">No se pudo guardar: ${err.message}</div>`;
      submitBtn.disabled = false;
    }
  });
}

// ---------- Vista de datos guardados ----------

function renderVista() {
  const d = datosActuales || {};
  document.getElementById("viewCodigo").textContent = `Placa ${codigo}`;
  document.getElementById("viewNombre").textContent = d.nombre || "(sin nombre registrado)";

  const foto = document.getElementById("viewFoto");
  if (d.fotoURL) {
    foto.src = d.fotoURL;
    show(foto);
  } else {
    hide(foto);
  }

  const items = [];
  if (d.tipoAnimal) items.push(["Tipo de animal", d.tipoAnimal]);
  if (d.raza) items.push(["Raza", d.raza]);

  if (d.metodoEdad === "nacimiento" && d.anoNacimiento) {
    items.push(["Edad", `${calcularEdadDesdeAno(d.anoNacimiento)} años (nació en ${d.anoNacimiento})`]);
  } else if (d.fechaAdopcion) {
    items.push(["Tiempo con la familia", calcularTiempoDesdeFecha(d.fechaAdopcion)]);
  }

  if (d.telefonoDueno) items.push(["Teléfono del dueño", d.telefonoDueno]);
  if (d.correoDueno) items.push(["Correo del dueño", d.correoDueno]);

  const dl = document.getElementById("viewDatos");
  if (items.length === 0) {
    dl.innerHTML = '<p style="color:var(--ink-soft)">No se registró información adicional.</p>';
    return;
  }
  dl.innerHTML = items.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
}

// ---------- Edición (contraseña + modal de edición) ----------

function initEdicion() {
  const btnEditar = document.getElementById("btnEditar");
  const modalPassword = document.getElementById("modalPassword");
  const passInput = document.getElementById("passInput");
  const passMsg = document.getElementById("passMsg");
  const btnCancelPass = document.getElementById("btnCancelPass");
  const btnVerificarPass = document.getElementById("btnVerificarPass");

  const modalEditar = document.getElementById("modalEditar");
  const btnCancelEdit = document.getElementById("btnCancelEdit");
  const editForm = document.getElementById("editForm");
  const editMsg = document.getElementById("editMsg");

  const editTipoAnimal = document.getElementById("editTipoAnimal");
  const editTipoOtroWrap = document.getElementById("editTipoOtroWrap");
  const editTipoOtro = document.getElementById("editTipoOtro");
  const editConoceNacimiento = document.getElementById("editConoceNacimiento");
  const editFechaAdopcionWrap = document.getElementById("editFechaAdopcionWrap");
  const editAnoNacimientoWrap = document.getElementById("editAnoNacimientoWrap");

  btnEditar.addEventListener("click", () => {
    passInput.value = "";
    passMsg.innerHTML = "";
    modalPassword.classList.remove("hidden");
    passInput.focus();
  });

  btnCancelPass.addEventListener("click", () => modalPassword.classList.add("hidden"));

  btnVerificarPass.addEventListener("click", () => {
    const intento = passInput.value;
    if (!intento) {
      passMsg.innerHTML = '<div class="status-msg error">Escribe la contraseña.</div>';
      return;
    }
    if (intento !== (datosActuales.contrasenaModificacion || "")) {
      passMsg.innerHTML = '<div class="status-msg error">Contraseña incorrecta.</div>';
      return;
    }
    modalPassword.classList.add("hidden");
    abrirModalEdicion();
  });

  editTipoAnimal.addEventListener("change", () => {
    editTipoOtroWrap.style.display = editTipoAnimal.value === "__otro__" ? "" : "none";
  });

  editConoceNacimiento.addEventListener("change", () => {
    if (editConoceNacimiento.checked) {
      hide(editFechaAdopcionWrap);
      show(editAnoNacimientoWrap);
    } else {
      show(editFechaAdopcionWrap);
      hide(editAnoNacimientoWrap);
    }
  });

  function abrirModalEdicion() {
    const d = datosActuales;
    editMsg.innerHTML = "";

    const opciones = Array.from(editTipoAnimal.options).map((o) => o.value);
    if (d.tipoAnimal && opciones.includes(d.tipoAnimal)) {
      editTipoAnimal.value = d.tipoAnimal;
      editTipoOtroWrap.style.display = "none";
    } else if (d.tipoAnimal) {
      editTipoAnimal.value = "__otro__";
      editTipoOtro.value = d.tipoAnimal;
      editTipoOtroWrap.style.display = "";
    } else {
      editTipoAnimal.value = "";
    }

    document.getElementById("editNombre").value = d.nombre || "";
    document.getElementById("editRaza").value = d.raza || "";
    document.getElementById("editTelefonoDueno").value = d.telefonoDueno || "";
    document.getElementById("editCorreoDueno").value = d.correoDueno || "";
    document.getElementById("editContrasenaNueva").value = "";

    if (d.metodoEdad === "nacimiento") {
      editConoceNacimiento.checked = true;
      show(editAnoNacimientoWrap);
      hide(editFechaAdopcionWrap);
      document.getElementById("editAnoNacimiento").value = d.anoNacimiento || "";
    } else {
      editConoceNacimiento.checked = false;
      show(editFechaAdopcionWrap);
      hide(editAnoNacimientoWrap);
      document.getElementById("editFechaAdopcion").value = d.fechaAdopcion || "";
    }

    modalEditar.classList.remove("hidden");
  }

  btnCancelEdit.addEventListener("click", () => modalEditar.classList.add("hidden"));

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    editMsg.innerHTML = "";

    if (!confirm("¿Estás seguro de guardar los cambios?")) return;

    const tipoSel = editTipoAnimal.value;
    const tipoFinal = tipoSel === "__otro__" ? editTipoOtro.value.trim() : tipoSel;

    const nuevaContrasena = document.getElementById("editContrasenaNueva").value;

    const cambios = {
      tipoAnimal: tipoFinal || "",
      nombre: document.getElementById("editNombre").value.trim(),
      raza: document.getElementById("editRaza").value.trim(),
      telefonoDueno: document.getElementById("editTelefonoDueno").value.trim(),
      correoDueno: document.getElementById("editCorreoDueno").value.trim(),
      metodoEdad: editConoceNacimiento.checked ? "nacimiento" : "adopcion",
      fechaAdopcion: editConoceNacimiento.checked ? "" : document.getElementById("editFechaAdopcion").value,
      anoNacimiento: editConoceNacimiento.checked
        ? Number(document.getElementById("editAnoNacimiento").value) || null
        : null,
    };

    if (nuevaContrasena) {
      if (nuevaContrasena.length < 4) {
        editMsg.innerHTML = '<div class="status-msg error">La nueva contraseña debe tener al menos 4 caracteres.</div>';
        return;
      }
      cambios.contrasenaModificacion = nuevaContrasena;
    }

    const submitBtn = editForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    editMsg.innerHTML = '<div class="status-msg info"><span class="spinner"></span> Guardando…</div>';

    try {
      const archivo = document.getElementById("editFoto").files[0];
      if (archivo) {
        // Se sube al mismo path, así que sobrescribe la foto anterior.
        const fotoRef = ref(storage, `${codigo}/foto`);
        await uploadBytes(fotoRef, archivo, { contentType: archivo.type });
        cambios.fotoURL = await getDownloadURL(fotoRef);
      }

      await updateDoc(doc(db, codigo, "datos"), cambios);

      editMsg.innerHTML = '<div class="status-msg success">Cambios guardados. Recargando…</div>';
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      console.error(err);
      editMsg.innerHTML = `<div class="status-msg error">No se pudo guardar: ${err.message}</div>`;
      submitBtn.disabled = false;
    }
  });
}
