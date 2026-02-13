/**
 * Sistema de Evaluación de Riesgos Laborales - NTP 330
 * @version 1.0.0
 */

'use strict';

// Configuración global
const CONFIG = {
    STORAGE_PREFIX: 'riesgo_',
    DATE_FORMAT: 'es-UY',
    MESSAGES: {
        SUCCESS_SAVE: 'Riesgo guardado correctamente',
        SUCCESS_DELETE: 'Riesgo eliminado',
        SUCCESS_CLEAR: 'Todos los riesgos han sido eliminados',
        ERROR_SAVE: 'Error al guardar: ',
        ERROR_DELETE: 'Error al eliminar',
        ERROR_FIELDS: 'Por favor, completa todos los campos obligatorios (*)',
        CONFIRM_DELETE: '¿Estás seguro de eliminar este riesgo?',
        CONFIRM_CLEAR: '¿Estás seguro de eliminar TODOS los riesgos? Esta acción no se puede deshacer.',
        NO_RISKS_PDF: 'No hay riesgos para generar el informe'
    }
};

// Estado de la aplicación
const AppState = {
    riesgos: [],
    editIndex: -1
};

// Calculadora NTP 330
const Calculator = {
    calcularNivelRiesgo(nd, ne, nc) {
        return nd * ne * nc;
    },
    
    obtenerInterpretacion(nr) {
        if (nr >= 4000) {
            return { nivel: 'I', texto: 'Situación crítica', prioridad: 1 };
        }
        if (nr >= 500) {
            return { nivel: 'II', texto: 'Corregir y adoptar medidas', prioridad: 2 };
        }
        if (nr >= 150) {
            return { nivel: 'III', texto: 'Mejorar si es posible', prioridad: 3 };
        }
        return { nivel: 'IV', texto: 'Mantener medidas', prioridad: 4 };
    }
};

// Gestor de almacenamiento
const Storage = {
    cargarRiesgos() {
        const riesgos = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CONFIG.STORAGE_PREFIX)) {
                try {
                    const data = localStorage.getItem(key);
                    if (data) {
                        riesgos.push(JSON.parse(data));
                    }
                } catch (e) {
                    console.error('Error al cargar riesgo:', e);
                }
            }
        }
        return riesgos;
    },
    
    guardarRiesgo(riesgo) {
        try {
            const key = CONFIG.STORAGE_PREFIX + riesgo.id;
            localStorage.setItem(key, JSON.stringify(riesgo));
            return true;
        } catch (e) {
            console.error('Error al guardar:', e);
            throw e;
        }
    },
    
    eliminarRiesgo(id) {
        try {
            const key = CONFIG.STORAGE_PREFIX + id;
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error al eliminar:', e);
            throw e;
        }
    },
    
    eliminarTodos(riesgos) {
        try {
            riesgos.forEach(r => {
                const key = CONFIG.STORAGE_PREFIX + r.id;
                localStorage.removeItem(key);
            });
            return true;
        } catch (e) {
            console.error('Error al eliminar todos:', e);
            throw e;
        }
    }
};

// Validador de formularios
const Validator = {
    validarFormulario(data) {
        const errors = [];
        
        if (!data.nombre || data.nombre.trim() === '') {
            errors.push('El nombre del riesgo es obligatorio');
        }
        
        if (!data.area || data.area.trim() === '') {
            errors.push('El área es obligatoria');
        }
        
        if (!data.nd || isNaN(data.nd)) {
            errors.push('Debe seleccionar el Nivel de Deficiencia');
        }
        
        if (!data.ne || isNaN(data.ne)) {
            errors.push('Debe seleccionar el Nivel de Exposición');
        }
        
        if (!data.nc || isNaN(data.nc)) {
            errors.push('Debe seleccionar el Nivel de Consecuencia');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
};

// Gestor de interfaz
const UI = {
    obtenerDatosFormulario() {
        return {
            nombre: document.getElementById('nombreRiesgo').value.trim(),
            area: document.getElementById('area').value.trim(),
            descripcion: document.getElementById('descripcion').value.trim(),
            nd: parseInt(document.getElementById('nd').value),
            ne: parseInt(document.getElementById('ne').value),
            nc: parseInt(document.getElementById('nc').value),
            medidas: document.getElementById('medidas').value.trim()
        };
    },
    
    mostrarResultado(nr, interpretacion) {
        const resultBox = document.getElementById('resultBox');
        const resultValue = document.getElementById('resultValue');
        const resultLabel = document.getElementById('resultLabel');
        
        resultBox.style.display = 'block';
        resultValue.textContent = nr;
        resultLabel.textContent = `Nivel ${interpretacion.nivel} - ${interpretacion.texto}`;
        
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    
    limpiarFormulario() {
        document.getElementById('riskForm').reset();
        document.getElementById('resultBox').style.display = 'none';
        AppState.editIndex = -1;
    },
    
    cargarDatosEnFormulario(riesgo) {
        document.getElementById('nombreRiesgo').value = riesgo.nombre;
        document.getElementById('area').value = riesgo.area;
        document.getElementById('descripcion').value = riesgo.descripcion || '';
        document.getElementById('nd').value = riesgo.nd;
        document.getElementById('ne').value = riesgo.ne;
        document.getElementById('nc').value = riesgo.nc;
        document.getElementById('medidas').value = riesgo.medidas || '';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    
    renderizarTabla(riesgos) {
        const container = document.getElementById('tablaContainer');
        
        if (riesgos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                    </svg>
                    <h3>No hay riesgos evaluados</h3>
                    <p>Comienza agregando tu primera evaluación de riesgo</p>
                </div>
            `;
            return;
        }
        
        const filas = riesgos.map((r, index) => `
            <tr>
                <td><strong>${this.escaparHTML(r.nombre)}</strong></td>
                <td>${this.escaparHTML(r.area)}</td>
                <td>${r.nd} × ${r.ne} × ${r.nc}</td>
                <td><strong>${r.nr}</strong></td>
                <td><span class="nivel-badge nivel-${r.nivel}">Nivel ${r.nivel}</span></td>
                <td class="action-buttons">
                    <button class="btn-secondary btn-small" onclick="App.editarRiesgo(${index})">Editar</button>
                    <button class="btn-danger btn-small" onclick="App.eliminarRiesgo(${index})">Eliminar</button>
                </td>
            </tr>
        `).join('');
        
        container.innerHTML = `
            <table class="risks-table">
                <thead>
                    <tr>
                        <th scope="col">Riesgo</th>
                        <th scope="col">Área</th>
                        <th scope="col">ND×NE×NC</th>
                        <th scope="col">NR</th>
                        <th scope="col">Nivel</th>
                        <th scope="col">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
            </table>
        `;
    },
    
    escaparHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Generador de PDF
const PDF = {
    generar(riesgos) {
        if (riesgos.length === 0) {
            alert(CONFIG.MESSAGES.NO_RISKS_PDF);
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Encabezado
        doc.setFillColor(102, 126, 234);
        doc.rect(0, 0, 210, 35, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text('Informe de Evaluación de Riesgos', 105, 15, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text('Metodología NTP 330 - INSHT', 105, 23, { align: 'center' });
        doc.text(`Fecha: ${new Date().toLocaleDateString(CONFIG.DATE_FORMAT)}`, 105, 30, { align: 'center' });
        
        // Resumen
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Resumen Ejecutivo', 14, 45);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        const nivel1 = riesgos.filter(r => r.nivel === 'I').length;
        const nivel2 = riesgos.filter(r => r.nivel === 'II').length;
        const nivel3 = riesgos.filter(r => r.nivel === 'III').length;
        const nivel4 = riesgos.filter(r => r.nivel === 'IV').length;
        
        doc.text(`Total de riesgos evaluados: ${riesgos.length}`, 14, 52);
        doc.text(`Nivel I (Crítico): ${nivel1}`, 14, 59);
        doc.text(`Nivel II (Alto): ${nivel2}`, 14, 66);
        doc.text(`Nivel III (Medio): ${nivel3}`, 14, 73);
        doc.text(`Nivel IV (Bajo): ${nivel4}`, 14, 80);
        
        // Tabla de riesgos
        const tableData = riesgos.map(r => [
            r.nombre,
            r.area,
            `${r.nd}×${r.ne}×${r.nc}`,
            r.nr.toString(),
            `Nivel ${r.nivel}`,
            r.interpretacion
        ]);
        
        doc.autoTable({
            startY: 90,
            head: [['Riesgo', 'Área', 'Cálculo', 'NR', 'Nivel', 'Interpretación']],
            body: tableData,
            headStyles: { fillColor: [102, 126, 234], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            styles: { fontSize: 9, cellPadding: 3 }
        });
        
        // Detalles
        let yPos = doc.lastAutoTable.finalY + 15;
        
        riesgos.forEach((r, index) => {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`${index + 1}. ${r.nombre}`, 14, yPos);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            yPos += 7;
            
            doc.text(`Área: ${r.area}`, 14, yPos);
            yPos += 5;
            
            doc.text(`Nivel de Riesgo: ${r.nr} - Nivel ${r.nivel} (${r.interpretacion})`, 14, yPos);
            yPos += 5;
            
            if (r.descripcion) {
                doc.text('Descripción:', 14, yPos);
                yPos += 5;
                const descLines = doc.splitTextToSize(r.descripcion, 180);
                doc.text(descLines, 14, yPos);
                yPos += descLines.length * 5;
            }
            
            if (r.medidas) {
                yPos += 2;
                doc.text('Medidas Preventivas:', 14, yPos);
                yPos += 5;
                const medLines = doc.splitTextToSize(r.medidas, 180);
                doc.text(medLines, 14, yPos);
                yPos += medLines.length * 5;
            }
            
            yPos += 10;
        });
        
        const fecha = new Date().toISOString().split('T')[0];
        doc.save(`Informe_Riesgos_NTP330_${fecha}.pdf`);
    }
};

// Aplicación principal
const App = {
    init() {
        this.cargarDatos();
        this.configurarEventos();
    },
    
    cargarDatos() {
        AppState.riesgos = Storage.cargarRiesgos();
        this.ordenarYMostrar();
    },
    
    configurarEventos() {
        document.getElementById('riskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.procesarFormulario();
        });
        
        document.getElementById('btnLimpiar').addEventListener('click', () => {
            UI.limpiarFormulario();
        });
        
        document.getElementById('btnGenerarPDF').addEventListener('click', () => {
            PDF.generar(AppState.riesgos);
        });
        
        document.getElementById('btnLimpiarTodos').addEventListener('click', () => {
            this.limpiarTodos();
        });
    },
    
    procesarFormulario() {
        const datos = UI.obtenerDatosFormulario();
        
        const validacion = Validator.validarFormulario(datos);
        if (!validacion.isValid) {
            alert(CONFIG.MESSAGES.ERROR_FIELDS);
            return;
        }
        
        const nr = Calculator.calcularNivelRiesgo(datos.nd, datos.ne, datos.nc);
        const interpretacion = Calculator.obtenerInterpretacion(nr);
        
        UI.mostrarResultado(nr, interpretacion);
        
        const riesgo = {
            id: AppState.editIndex >= 0 ? AppState.riesgos[AppState.editIndex].id : Date.now(),
            nombre: datos.nombre,
            area: datos.area,
            descripcion: datos.descripcion,
            nd: datos.nd,
            ne: datos.ne,
            nc: datos.nc,
            nr: nr,
            nivel: interpretacion.nivel,
            interpretacion: interpretacion.texto,
            prioridad: interpretacion.prioridad,
            medidas: datos.medidas,
            fecha: new Date().toLocaleDateString(CONFIG.DATE_FORMAT)
        };
        
        this.guardarRiesgo(riesgo);
    },
    
    guardarRiesgo(riesgo) {
        try {
            if (AppState.editIndex >= 0) {
                AppState.riesgos[AppState.editIndex] = riesgo;
                AppState.editIndex = -1;
            } else {
                AppState.riesgos.push(riesgo);
            }
            
            Storage.guardarRiesgo(riesgo);
            this.ordenarYMostrar();
            UI.limpiarFormulario();
            alert(CONFIG.MESSAGES.SUCCESS_SAVE);
        } catch (e) {
            alert(CONFIG.MESSAGES.ERROR_SAVE + e.message);
        }
    },
    
    ordenarYMostrar() {
        AppState.riesgos.sort((a, b) => {
            if (a.prioridad !== b.prioridad) {
                return a.prioridad - b.prioridad;
            }
            return b.nr - a.nr;
        });
        
        UI.renderizarTabla(AppState.riesgos);
    },
    
    editarRiesgo(index) {
        const riesgo = AppState.riesgos[index];
        AppState.editIndex = index;
        UI.cargarDatosEnFormulario(riesgo);
    },
    
    eliminarRiesgo(index) {
        if (!confirm(CONFIG.MESSAGES.CONFIRM_DELETE)) {
            return;
        }
        
        try {
            const riesgo = AppState.riesgos[index];
            Storage.eliminarRiesgo(riesgo.id);
            AppState.riesgos.splice(index, 1);
            this.ordenarYMostrar();
            alert(CONFIG.MESSAGES.SUCCESS_DELETE);
        } catch (e) {
            alert(CONFIG.MESSAGES.ERROR_DELETE);
        }
    },
    
    limpiarTodos() {
        if (!confirm(CONFIG.MESSAGES.CONFIRM_CLEAR)) {
            return;
        }
        
        try {
            Storage.eliminarTodos(AppState.riesgos);
            AppState.riesgos = [];
            UI.renderizarTabla(AppState.riesgos);
            alert(CONFIG.MESSAGES.SUCCESS_CLEAR);
        } catch (e) {
            alert(CONFIG.MESSAGES.ERROR_DELETE);
        }
    }
};

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

// Exponer para eventos inline
window.App = App;