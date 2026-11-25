"""Run under the archive's unix-only.py guard, passing an installed Chromium binary."""
import base64
import pathlib
import socket
import subprocess
import sys
import tempfile

for family in (socket.AF_INET, socket.AF_INET6):
    try:
        with socket.socket(family):
            raise AssertionError("Network guard required")
    except PermissionError:
        pass

source = pathlib.Path(__file__).with_name("business-quote-body.mjs").read_bytes()
url = "data:text/javascript;base64," + base64.b64encode(source).decode()
with tempfile.TemporaryDirectory() as work:
    root = pathlib.Path(work)
    page = root / "form.html"
    page.write_text("""<!DOCTYPE html><meta charset=utf-8>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' data:; form-action 'none'; connect-src 'none'">
<form><input name="name" required><input name="company"><button>Submit</button></form>
<output>pending</output><script type="module">
import {prepareBusinessQuote} from '""" + url + """';
const form = document.querySelector('form'), company = form.elements.company;
let submits = 0, prepared = 0;
form.onsubmit = event => {
  event.preventDefault();
  submits++;
  const fields = Object.fromEntries(new FormData(form));
  const body = prepareBusinessQuote(form, fields, 'fixture');
  if (body?.businessName === 'Fixture Ltd' && body.contactName === 'Visitor') prepared++;
};
form.elements.name.value = 'Visitor';
company.value = '   ';
form.requestSubmit();
const flagged = company.validity.customError && company.validationMessage === 'Please enter your business name.';
form.requestSubmit();
const blocked = submits === 1 && prepared === 0;
company.value = 'Fixture Ltd';
company.dispatchEvent(new Event('input', {bubbles:true}));
form.requestSubmit();
if (flagged && blocked && !company.validity.customError && submits === 2 && prepared === 1)
  document.querySelector('output').textContent = 'passed';
</script>""")
    result = subprocess.run([sys.argv[1], "--headless", "--no-sandbox", "--disable-dev-shm-usage",
        "--disable-background-networking", "--disable-extensions", "--disable-sync", "--no-first-run",
        "--user-data-dir=" + str(root/"profile"), "--dump-dom", page.as_uri()],
        env={"HOME": work, "PATH": "/usr/bin:/bin"}, capture_output=True, timeout=30)
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors="replace")[-2000:])
    assert b"<output>passed</output>" in result.stdout
print("PASS Chromium native validity, repeat submit blocked, corrected value accepted")
