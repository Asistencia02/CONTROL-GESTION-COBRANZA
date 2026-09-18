-- Crear tabla de historial de chatbot

CREATE TABLE IF NOT EXISTS chatbot_historial (
  id BIGSERIAL PRIMARY KEY,
  institucion_id INTEGER NOT NULL,
  pregunta TEXT NOT NULL,
  respuesta TEXT NOT NULL,
  modelo VARCHAR(50) DEFAULT 'mistral:7b',
  tipo_pregunta VARCHAR(50),
  datos_consultados BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (institucion_id) REFERENCES instituciones(id) ON DELETE CASCADE
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_chatbot_institucion ON chatbot_historial(institucion_id);
CREATE INDEX idx_chatbot_fecha ON chatbot_historial(created_at);
CREATE INDEX idx_chatbot_tipo ON chatbot_historial(tipo_pregunta);

-- RLS (Row Level Security)
ALTER TABLE chatbot_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver historial de su institución"
  ON chatbot_historial
  FOR SELECT
  USING (
    institucion_id IN (
      SELECT institucion_id FROM usuarios WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios pueden insertar en historial de su institución"
  ON chatbot_historial
  FOR INSERT
  WITH CHECK (
    institucion_id IN (
      SELECT institucion_id FROM usuarios WHERE usuario_id = auth.uid()
    )
  );
