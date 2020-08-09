# Code Annotator - Summary

## Pending
{% for note in notes -%}
### {{ note.text }}

{{ note.fileName }}
```
{{ note.codeSnippet }}
```
{% endfor %}

## Done
{% for note in notes -%}
### {{ note.text }}

{{ note.fileName }}
```
{{ note.codeSnippet }}
```
{% endfor %}
