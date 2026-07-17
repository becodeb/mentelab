# 01 — Visión del producto y casos de uso

> Nombre de trabajo: **MenteLab** (provisorio, fácil de cambiar: vive en una constante de configuración).

## 1. Visión

MenteLab es una plataforma web de entrenamiento y medición de habilidades cognitivas para escuelas primarias y secundarias. Los alumnos juegan periódicamente mini-juegos ("benchmarks") que miden de forma cuantitativa capacidades como velocidad de reacción, memoria de trabajo, atención visual y precisión. Cada partida genera datos ricos (no solo el resultado final, sino cada evento) que se conservan para siempre y alimentan:

- **Para el alumno**: progreso personal visible, gamificación, perfil cognitivo, motivación por volver a jugar.
- **Para el docente**: paneles de evolución individual y grupal, comparaciones, exportación de datos.
- **Para la institución**: rankings internos, análisis longitudinal, evaluación del impacto de intervenciones.
- **Para el futuro**: un dataset de eventos que permite análisis estadísticos profundos sin modificar los juegos.

### Principios de diseño (en orden de prioridad)

1. **Que los chicos quieran volver** — la retención es la métrica número uno. Sin partidas repetidas no hay datos longitudinales.
2. **Progreso personal antes que competencia** — el eje central es "vos contra vos mismo de ayer". Los rankings existen, pero nunca son la única lectura del resultado.
3. **Datos primero** — todo lo que ocurre en una partida se registra como eventos inmutables. Nunca se sobrescribe ni se borra un intento.
4. **Simplicidad extrema de acceso** — un alumno de 6 años debe entrar en menos de 10 segundos sin ayuda.
5. **Aislamiento total entre instituciones** — los datos de una escuela jamás se mezclan con los de otra, ni con el Modo Libre.
6. **Divertido pero serio** — estética lúdica para niños, instrumentación de laboratorio por debajo (timestamps de alta resolución, detección de pérdida de foco, FPS, latencias).

### No-objetivos (explícitos)

- **No es una herramienta de diagnóstico clínico ni psicométrico.** El "perfil cognitivo" es un indicador lúdico-educativo y así se comunica siempre (disclaimer visible para docentes).
- **No es una red social**: no hay chat, mensajes entre alumnos ni contenido generado por usuarios.
- **No busca máxima seguridad en el login de alumnos**: busca máxima facilidad con separación de datos razonable (ver doc 07).
- **No expone datos de un alumno a otros alumnos** más allá de nombre/avatar/puntaje en rankings internos del curso.

## 2. Actores (personas)

| Actor | Descripción | Dispositivo típico |
|---|---|---|
| **Alumno primaria (6–12)** | Lector inicial o intermedio. Usa tablet escolar o notebook compartida. Sin email. | Tablet táctil |
| **Alumno secundaria (13–18)** | Autónomo, competitivo, sensible al ridículo. | Notebook / celular |
| **Docente** | Administra sus cursos, carga alumnos, mira evolución, exporta. Poco tiempo, necesita flujos directos. | Notebook |
| **Directivo / Admin institucional** | Ve toda la institución, compara cursos y años, gestiona docentes. | Notebook |
| **Super Admin (plataforma)** | Crea instituciones, soporte, métricas globales de uso. | Notebook |
| **Invitado (Modo Libre)** | Docente evaluando la plataforma, padre/madre, público general. Sin cuenta. | Cualquiera |

## 3. Casos de uso

### Alumno

- **CU-A1 Ingresar**: llega a la pantalla de login, elige (o ya está recordado) su curso, toca su nombre en una grilla con avatares, ingresa su clave simple (PIN o secuencia de imágenes) y entra. < 10 segundos.
- **CU-A2 Jugar un benchmark**: elige un juego del hub, ve instrucciones/tutorial la primera vez, juega, recibe feedback inmediato y una pantalla de resultados con celebración si corresponde.
- **CU-A3 Ver mi progreso**: consulta su perfil: récord, promedio, gráfico de evolución, racha, nivel/XP, insignias, perfil cognitivo con barras.
- **CU-A4 Cumplir misiones diarias**: ve 2–3 misiones del día ("jugá 3 partidas de memoria", "mejorá tu promedio de reacción") y las completa para ganar XP.
- **CU-A5 Ver rankings**: consulta el ranking de su curso/grado/edad/institución, con su propia posición siempre visible y encuadrada en positivo.
- **CU-A6 Romper un récord personal**: la app lo detecta en el momento y lo celebra con animación, insignia y XP extra.

### Docente

- **CU-D1 Crear y gestionar cursos**: crea cursos/divisiones dentro del año escolar, con grado y edad asociada.
- **CU-D2 Cargar alumnos**: alta manual uno a uno o importación CSV (nombre, apellido, curso). Genera automáticamente claves simples.
- **CU-D3 Gestionar alumnos**: editar nombre, mover de curso (conservando historial), desactivar (nunca borrar datos), resetear clave.
- **CU-D4 Iniciar una sesión de clase**: proyecta un QR / código de clase para que todos entren rápido desde tablets.
- **CU-D5 Analizar**: dashboards de curso (promedios, distribución, boxplots, evolución, heatmap de actividad), drill-down a un alumno y a cada intento individual.
- **CU-D6 Comparar**: curso vs curso, grado vs grado, edad vs edad, benchmark vs benchmark, período vs período. Género opcional (si la institución lo habilita y carga el dato).
- **CU-D7 Exportar**: CSV y Excel de intentos crudos o agregados, con filtros aplicados.

### Admin institucional

- **CU-I1** Gestionar docentes (invitar, roles, desactivar).
- **CU-I2** Configurar años escolares, grados, cursos.
- **CU-I3** Ver dashboards a nivel institución completa.
- **CU-I4** Configurar opciones (habilitar campo género, habilitar rankings visibles para alumnos, etc.).

### Super Admin

- **CU-S1** Crear instituciones y su primer admin.
- **CU-S2** Ver métricas globales de uso (sin datos personales de alumnos).
- **CU-S3** Gestionar el catálogo de benchmarks (activar/desactivar por institución si hiciera falta).

### Invitado (Modo Libre)

- **CU-G1 Jugar sin cuenta**: entra a la landing, toca "Jugar", juega cualquier benchmark. Cero fricción.
- **CU-G2 Conservar historial local**: sus resultados quedan asociados a un identificador anónimo del dispositivo; ve récord, cantidad de partidas y evolución.
- **CU-G3 Ranking global**: opcionalmente elige un alias y aparece en el ranking mundial del Modo Libre (separado al 100 % del institucional).
- **CU-G4 Migrar historial**: si más tarde recibe credenciales de una institución (o crea una cuenta), puede vincular su historial anónimo a su nuevo perfil.

## 4. Métricas de éxito del producto

- % de alumnos que juegan ≥ 2 veces por semana (retención).
- Racha media de días de juego.
- Partidas por alumno por mes (volumen de datos).
- % de docentes que consultan el panel al menos 1 vez por semana.
- Tiempo de login del alumno (objetivo p95 < 10 s).
- % de intentos completados vs abandonados (calidad del dato).
