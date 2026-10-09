-- Scope name authority: silver.<scope_id>.display_name.
-- Database trigger synchronizes the denormalized Registry name transactionally.
-- Scope Groups and system nodes own their display_name in silver.scope_registry.
CREATE OR REPLACE FUNCTION silver.sync_scope_config_display_name()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $func$
BEGIN
  IF TG_TABLE_SCHEMA <> 'silver' OR NEW.id IS DISTINCT FROM TG_TABLE_NAME
     OR btrim(coalesce(NEW.display_name,''))='' THEN
    RAISE EXCEPTION 'Invalid Scope display_name sync target';
  END IF;
  UPDATE silver.scope_registry
     SET display_name=btrim(NEW.display_name),updated_at=now()
   WHERE scope_id=NEW.id AND scope_kind='scope'
     AND display_name IS DISTINCT FROM btrim(NEW.display_name);
  RETURN NEW;
END;
$func$;
DO $existing$
DECLARE r record;
BEGIN
  FOR r IN SELECT scope_id FROM silver.scope_registry WHERE scope_kind='scope' LOOP
    IF to_regclass(format('silver.%I',r.scope_id)) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS sync_scope_display_name ON silver.%I',r.scope_id);
      EXECUTE format('CREATE TRIGGER sync_scope_display_name AFTER INSERT OR UPDATE OF display_name ON silver.%I FOR EACH ROW EXECUTE FUNCTION silver.sync_scope_config_display_name()',r.scope_id);
    END IF;
  END LOOP;
END;
$existing$;
DO $provision$
DECLARE definition text;
DECLARE needle text := $needle$  execute format('create table silver.%I (like silver.lo3rwang including all)',v_config_name);$needle$;
DECLARE addition text := $addition$
  execute format('create trigger sync_scope_display_name after insert or update of display_name on silver.%I for each row execute function silver.sync_scope_config_display_name()',v_config_name);$addition$;
BEGIN
  SELECT pg_get_functiondef('api.provision_scope(text,text,text,date,text,text,text,text,boolean)'::regprocedure) INTO definition;
  IF position(needle in definition)=0 THEN
    RAISE EXCEPTION 'Scope provisioner signature has changed; display_name sync not installed';
  END IF;
  EXECUTE replace(definition,needle,needle||addition);
END;
$provision$;
