DROP TRIGGER IF EXISTS set_post_updated_at ON core.post;
CREATE TRIGGER set_post_updated_at
  BEFORE UPDATE ON core.post
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
