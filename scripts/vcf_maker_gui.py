import os
import sys
import threading
import subprocess
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk
import csv

try:
    # optional: tkinterdnd2 provides easier drag-and-drop if installed
    from TkinterDnD2 import TkinterDnD
    DND_AVAILABLE = True
except Exception:
    TkinterDnD = None
    DND_AVAILABLE = False


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VCF_SCRIPT = os.path.join(SCRIPT_DIR, "vcf_maker.py")


def run_vcf_maker(input_path, output_path, name_field, phone_fields, phone_labels, prefix, postfix, log_widget, run_button, root, progressbar, stop_event=None):
    def target():
        run_button.config(state=tk.DISABLED)
        progressbar['value'] = 0
        progressbar['maximum'] = 100
        log_widget.configure(state=tk.NORMAL)
        log_widget.delete("1.0", tk.END)
        try:
            # import the vcf_maker module from the scripts dir
            if SCRIPT_DIR not in sys.path:
                sys.path.insert(0, SCRIPT_DIR)
            import vcf_maker

            def progress_cb(processed, total):
                # schedule UI updates on main thread
                def ui_update():
                    try:
                        pct = int(processed / total * 100) if total else 0
                    except Exception:
                        pct = 0
                    progressbar['value'] = pct
                    log_widget.insert(tk.END, f"Processed {processed}/{total}\n")
                    try:
                        # update status label with row counts
                        status_var.set(f"Rows: {total} — processed {processed}")
                    except Exception:
                        pass
                    log_widget.see(tk.END)
                root.after(1, ui_update)

            written = vcf_maker.write_vcards_stream(input_path, output_path, name_field, phone_fields, phone_labels, prefix, postfix, progress_cb, stop_event)

            def on_done():
                log_widget.insert(tk.END, f"\nFinished. {written} vCards written to {output_path}\n")
                log_widget.see(tk.END)
                try:
                    out_dir = os.path.dirname(os.path.abspath(output_path)) or os.getcwd()
                    if os.path.isdir(out_dir):
                        os.startfile(out_dir)
                except Exception:
                    pass
                messagebox.showinfo("Done", f"VCF created: {os.path.basename(output_path)}")
            root.after(50, on_done)
        except Exception as e:
            log_widget.insert(tk.END, f"Error: {e}\n")
        finally:
            log_widget.configure(state=tk.DISABLED)
            run_button.config(state=tk.NORMAL)

    threading.Thread(target=target, daemon=True).start()


def browse_input(entry_widget, on_change=None):
    p = filedialog.askopenfilename(title="Select contacts CSV", filetypes=[("CSV files", "*.csv"), ("All files", "*")])
    if p:
        entry_widget.delete(0, tk.END)
        entry_widget.insert(0, p)
        if on_change:
            try:
                on_change()
            except Exception:
                pass


def browse_output(entry_widget):
    p = filedialog.asksaveasfilename(title="Save VCF as", defaultextension=".vcf", filetypes=[("VCF files", "*.vcf"), ("All files", "*")])
    if p:
        entry_widget.delete(0, tk.END)
        entry_widget.insert(0, p)


def load_csv_preview(path: str):
    # return headers and up to first 5 rows as list of dicts
    rows = []
    # try common encodings
    encodings = ["utf-8", "utf-8-sig", "latin-1"]
    headers = []
    for enc in encodings:
        try:
            with open(path, newline="", encoding=enc) as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames or []
                for i, r in enumerate(reader):
                    if i >= 5:
                        break
                    rows.append(r)
            if headers:
                break
        except Exception:
            rows = []
            headers = []
            continue
    return headers, rows


def build_gui():
    # Use TkinterDnD root if available for DnD support
    if DND_AVAILABLE and TkinterDnD is not None:
        root = TkinterDnD.Tk()
    else:
        root = tk.Tk()
    root.title("vCard Maker GUI")
    root.geometry("700x480")

    frame = tk.Frame(root, padx=10, pady=10)
    frame.pack(fill=tk.BOTH, expand=True)

    # Input row
    tk.Label(frame, text="Input CSV:").grid(row=0, column=0, sticky=tk.W)
    input_entry = tk.Entry(frame, width=60)
    input_entry.grid(row=0, column=1, padx=6, sticky=tk.W)

    # Keep track of last auto-generated output so we don't overwrite a user choice
    last_auto = {"value": ""}

    def update_output_default(event=None):
        input_path = input_entry.get().strip()
        if not input_path:
            try:
                run_button.config(state=tk.DISABLED)
            except Exception:
                pass
            return
        base = os.path.splitext(os.path.basename(input_path))[0]
        dirn = os.path.dirname(input_path) or "."
        suggested = os.path.join(dirn, base + ".vcf")
        cur = output_entry.get().strip()
        if not cur or cur == last_auto["value"]:
            output_entry.delete(0, tk.END)
            output_entry.insert(0, suggested)
            last_auto["value"] = suggested
        # load preview and populate field selectors
        try:
            headers, rows = load_csv_preview(input_path)
            populate_field_selectors(headers)
            populate_preview(rows)
            try:
                run_button.config(state=tk.NORMAL)
            except Exception:
                pass
        except Exception:
            try:
                run_button.config(state=tk.DISABLED)
            except Exception:
                pass

    input_entry.bind("<KeyRelease>", update_output_default)
    input_entry.bind("<FocusOut>", update_output_default)

    tk.Button(frame, text="Browse...", command=lambda: browse_input(input_entry, update_output_default)).grid(row=0, column=2)

    # Add drag-and-drop support (if TkinterDnD available register, else best-effort skipped)
    if DND_AVAILABLE and TkinterDnD is not None:
        def dnd_handler(event):
            # event.data may contain a list of file paths
            paths = root.splitlist(event.data)
            if paths:
                input_entry.delete(0, tk.END)
                input_entry.insert(0, paths[0])
                update_output_default()
        input_entry.drop_target_register('*')
        input_entry.dnd_bind('<<Drop>>', dnd_handler)

    # Output row
    tk.Label(frame, text="Output VCF:").grid(row=1, column=0, sticky=tk.W)
    output_entry = tk.Entry(frame, width=60)
    output_entry.grid(row=1, column=1, padx=6, sticky=tk.W)
    tk.Button(frame, text="Browse...", command=lambda: browse_output(output_entry)).grid(row=1, column=2)

    # Postfix
    tk.Label(frame, text="Postfix:").grid(row=2, column=0, sticky=tk.W)
    postfix_entry = tk.Entry(frame, width=60)
    postfix_entry.grid(row=2, column=1, padx=6, sticky=tk.W)

    # Name and phone field selectors (populated from CSV header)
    tk.Label(frame, text="Name field:").grid(row=3, column=0, sticky=tk.W)
    # make combobox editable so users can type a custom column name
    name_field_combo = ttk.Combobox(frame, values=[], width=25, state='normal')
    name_field_combo.grid(row=3, column=1, sticky=tk.W)

    tk.Label(frame, text="Phone fields:").grid(row=3, column=1, sticky=tk.E, padx=(0, 120))
    phone_fields_listbox = tk.Listbox(frame, selectmode=tk.EXTENDED, height=4, exportselection=False)
    phone_fields_listbox.grid(row=3, column=2, sticky=tk.W)

    tk.Label(frame, text="Phone labels (comma-separated):").grid(row=2, column=2, sticky=tk.W)
    phone_labels_entry = tk.Entry(frame, width=20)
    phone_labels_entry.grid(row=2, column=2, sticky=tk.E)

    def populate_field_selectors(headers):
        if not headers:
            name_field_combo['values'] = []
            phone_fields_listbox.delete(0, tk.END)
            return
        name_field_combo['values'] = headers
        phone_fields_listbox.delete(0, tk.END)
        for h in headers:
            phone_fields_listbox.insert(tk.END, h)
        # heuristics to pick defaults
        def pick(pref_list):
            for p in pref_list:
                for h in headers:
                    if h.lower() == p:
                        return h
            return headers[0]
        name_default = pick(['name', 'full_name', 'fullname', 'fn'])
        phone_default = pick(['phone', 'phone_number', 'mobile', 'cell'])
        try:
            name_field_combo.set(name_default)
        except Exception:
            pass
        # select a sensible phone field by default
        try:
            idx = headers.index(phone_default)
            phone_fields_listbox.selection_set(idx)
        except Exception:
            pass

    # Preview area (first 5 rows)
    tk.Label(frame, text="Preview (first 5 rows):").grid(row=4, column=0, sticky=tk.NW)
    preview = ttk.Treeview(frame, columns=("cols"), show='headings', height=5)
    preview.grid(row=4, column=1, columnspan=2, pady=(6, 0), sticky=tk.NSEW)

    # Prefix (optional)
    tk.Label(frame, text="Prefix:").grid(row=5, column=0, sticky=tk.W)
    prefix_entry = tk.Entry(frame, width=60)
    prefix_entry.grid(row=5, column=1, padx=6, sticky=tk.W)

    # Log area
    tk.Label(frame, text="Log:").grid(row=6, column=0, sticky=tk.NW)
    log = scrolledtext.ScrolledText(frame, height=8, state=tk.DISABLED)
    log.grid(row=6, column=1, columnspan=2, pady=(6, 0), sticky=tk.NSEW)

    # Progress bar
    progress = ttk.Progressbar(frame, orient='horizontal', length=400, mode='determinate')
    progress.grid(row=8, column=1, columnspan=2, pady=(6, 0), sticky=tk.W)

    # Configure grid weights
    frame.grid_rowconfigure(4, weight=1)
    frame.grid_rowconfigure(6, weight=1)
    frame.grid_columnconfigure(1, weight=1)

    # Save / Load mapping buttons
    def save_mapping():
        mapping = {
            'name_field': name_field_combo.get(),
            'phone_fields': [phone_fields_listbox.get(i) for i in phone_fields_listbox.curselection()],
            'phone_labels': phone_labels_entry.get(),
            'prefix': prefix_entry.get(),
            'postfix': postfix_entry.get(),
            'output': output_entry.get()
        }
        p = filedialog.asksaveasfilename(title='Save mapping', defaultextension='.json', filetypes=[('JSON', '*.json')])
        if p:
            try:
                import json
                with open(p, 'w', encoding='utf-8') as f:
                    json.dump(mapping, f, ensure_ascii=False, indent=2)
                messagebox.showinfo('Saved', f'Mapping saved to {p}')
            except Exception as e:
                messagebox.showerror('Error', f'Could not save mapping: {e}')

    def load_mapping():
        p = filedialog.askopenfilename(title='Load mapping', filetypes=[('JSON', '*.json'), ('All', '*')])
        if not p:
            return
        try:
            import json
            with open(p, 'r', encoding='utf-8') as f:
                mapping = json.load(f)
            if 'name_field' in mapping:
                name_field_combo.set(mapping['name_field'])
            if 'phone_fields' in mapping and isinstance(mapping['phone_fields'], list):
                # select items in listbox
                phone_fields_listbox.selection_clear(0, tk.END)
                for val in mapping['phone_fields']:
                    try:
                        idx = phone_fields_listbox.get(0, tk.END).index(val)
                        phone_fields_listbox.selection_set(idx)
                    except ValueError:
                        pass
            if 'phone_labels' in mapping:
                phone_labels_entry.delete(0, tk.END)
                phone_labels_entry.insert(0, mapping['phone_labels'])
            if 'prefix' in mapping:
                prefix_entry.delete(0, tk.END)
                prefix_entry.insert(0, mapping['prefix'])
            if 'postfix' in mapping:
                postfix_entry.delete(0, tk.END)
                postfix_entry.insert(0, mapping['postfix'])
            if 'output' in mapping:
                output_entry.delete(0, tk.END)
                output_entry.insert(0, mapping['output'])
            messagebox.showinfo('Loaded', f'Mapping loaded from {p}')
        except Exception as e:
            messagebox.showerror('Error', f'Could not load mapping: {e}')

    tk.Button(frame, text='Save mapping', command=save_mapping).grid(row=9, column=1, sticky=tk.W, pady=(6,0))
    tk.Button(frame, text='Load mapping', command=load_mapping).grid(row=9, column=2, sticky=tk.W, pady=(6,0))

    def populate_preview(rows):
        # clear
        for c in preview.get_children():
            preview.delete(c)
        if not rows:
            return
        headers = list(rows[0].keys())
        preview['columns'] = headers
        # compute column widths based on content (chars)
        col_widths = {h: max(len(h), 10) for h in headers}
        for r in rows:
            for h in headers:
                val = str(r.get(h, '') or '')
                col_widths[h] = max(col_widths[h], len(val))
        for h in headers:
            preview.heading(h, text=h)
            # set width in pixels approx (char*7)
            preview.column(h, width=min(col_widths[h] * 7, 400), anchor='w')
        for r in rows:
            preview.insert('', tk.END, values=[r.get(h, '') for h in headers])

    # status label for counts
    status_var = tk.StringVar(value="Rows: 0")
    status_lbl = tk.Label(frame, textvariable=status_var)
    status_lbl.grid(row=5, column=2, sticky=tk.E)

    stop_event = None

    def on_run():
        input_path = input_entry.get().strip() or "contacts.csv"
        output_path = output_entry.get().strip() or os.path.join(os.path.dirname(input_path) or '.', os.path.splitext(os.path.basename(input_path))[0] + '.vcf')
        prefix = prefix_entry.get()
        postfix = postfix_entry.get()
        name_field = name_field_combo.get().strip() or (name_field_combo['values'][0] if name_field_combo['values'] else '')
        # collect selected phone fields
        sel = phone_fields_listbox.curselection()
        phone_fields = [phone_fields_listbox.get(i) for i in sel] if sel else []
        labels_text = phone_labels_entry.get().strip()
        phone_labels = [s.strip() for s in labels_text.split(',')] if labels_text else []

        if not phone_fields:
            messagebox.showerror("No phone fields", "Please select at least one phone column from the list.")
            return

        if not os.path.exists(input_path):
            messagebox.showerror("Input not found", "Input CSV file does not exist.")
            return

        # create stop event and wire Cancel button
        nonlocal stop_event
        stop_event = threading.Event()
        cancel_button.config(state=tk.NORMAL)

        run_vcf_maker(input_path, output_path, name_field, phone_fields, phone_labels, prefix, postfix, log, run_button, root, progress, stop_event)

    run_button = tk.Button(frame, text="Run", width=12, command=on_run)
    run_button.grid(row=7, column=1, pady=10, sticky=tk.W)
    run_button.config(state=tk.DISABLED)

    cancel_button = tk.Button(frame, text="Cancel", width=12, state=tk.DISABLED, command=lambda: cancel_run())
    cancel_button.grid(row=7, column=2, pady=10, sticky=tk.W)

    def cancel_run():
        try:
            if stop_event:
                stop_event.set()
                cancel_button.config(state=tk.DISABLED)
        except Exception:
            pass

    # If TkinterDnD not available, try to enable simple Windows native DnD (best-effort)
    if not DND_AVAILABLE and os.name == 'nt':
        try:
            import ctypes
            from ctypes import wintypes

            user32 = ctypes.windll.user32
            shell32 = ctypes.windll.shell32
            GWL_WNDPROC = -4
            WM_DROPFILES = 0x0233

            WNDPROC = ctypes.WINFUNCTYPE(wintypes.LRESULT, wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)

            hwnd = root.winfo_id()

            old_wndproc = WNDPROC(user32.GetWindowLongPtrW(hwnd, GWL_WNDPROC))

            def py_wndproc(hWnd, msg, wParam, lParam):
                if msg == WM_DROPFILES:
                    count = shell32.DragQueryFileW(wParam, 0xFFFFFFFF, None, 0)
                    if count > 0:
                        buf_len = shell32.DragQueryFileW(wParam, 0, None, 0)
                        buf = ctypes.create_unicode_buffer(buf_len + 1)
                        shell32.DragQueryFileW(wParam, 0, buf, buf_len + 1)
                        path = buf.value
                        try:
                            root.after(10, lambda: (input_entry.delete(0, tk.END), input_entry.insert(0, path), update_output_default()))
                        except Exception:
                            pass
                    shell32.DragFinish(wParam)
                    return 0
                return user32.CallWindowProcW(old_wndproc, hWnd, msg, wParam, lParam)

            new_wndproc = WNDPROC(py_wndproc)
            user32.SetWindowLongPtrW(hwnd, GWL_WNDPROC, new_wndproc)
        except Exception:
            pass

    root.mainloop()


if __name__ == "__main__":
    if not os.path.exists(VCF_SCRIPT):
        tk.messagebox.showerror("Missing script", f"Could not find vcf_maker.py at {VCF_SCRIPT}")
        sys.exit(1)
    build_gui()
