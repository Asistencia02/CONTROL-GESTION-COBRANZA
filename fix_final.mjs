import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'src/renderer/modules/ReportesEjecutivos.tsx');

let content = fs.readFileSync(filePath, 'utf8');

const oldIf = `if (tieneDeuda) {
          estudiantesEnMora++
          if (deudaEst > 0) {
            topMorosos.push({
              dni: est.dni,
              nombre: \`\${est.nombre} \${est.apellido}\`,
              carrera: (est as any).carreras?.nombre || '',
              deuda: deudaEst,
            })
          }
        } else {
          estudiantesAlDia++
        }`;

const newIf = `if (conceptosPagados === conceptosDelEst.length) {
          estudiantesAlDia++
        } else {
          estudiantesEnMora++
          if (deudaTotal > 0) {
            topMorosos.push({
              dni: est.dni,
              nombre: \`\${est.nombre} \${est.apellido}\`,
              carrera: (est as any).carreras?.nombre || '',
              deuda: deudaTotal,
            })
          }
        }`;

content = content.replace(oldIf, newIf);
content = content.replace('let deudaEst = 0\n        let tieneDeuda = false', 'let conceptosPagados = 0\n        let deudaTotal = 0');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Arreglado');
