import json, sys, zipfile, xml.etree.ElementTree as ET
results = []
for filename in sys.argv[1:]:
    with zipfile.ZipFile(filename) as package:
        names = package.namelist()
        assert "README.md" in names and "LICENSE" in names
        assert not any(name.endswith((".js", ".mjs", ".razor")) for name in names)
        manifest = ET.fromstring(package.read(next(name for name in names if name.endswith(".nuspec"))))
        dependencies = [node.attrib for node in manifest.iter() if node.tag.endswith("dependency")]
        assert not any("AspNetCore" in dep["id"] for dep in dependencies)
        if "Yoast" not in filename:
            assert not any("SyntaxCircus." in dep["id"] for dep in dependencies)
        results.append(dict(path=filename, bytes=__import__("os").path.getsize(filename), files=names, dependencies=dependencies))
print(json.dumps(results, indent=2))
