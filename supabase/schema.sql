-- セミナー情報を格納するテーブル
CREATE TABLE IF NOT EXISTS seminars (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    participant_count INTEGER DEFAULT 0,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_date, event_time)
);

-- 更新時刻を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_seminars_updated_at BEFORE UPDATE
    ON seminars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- インデックスの作成
CREATE INDEX idx_seminars_event_date ON seminars(event_date);
CREATE INDEX idx_seminars_status ON seminars(status);
CREATE INDEX idx_seminars_scraped_at ON seminars(scraped_at);