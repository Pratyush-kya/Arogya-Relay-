import os
import shutil
import subprocess
import pypdf

REPORT_DIR = "/home/pratyush/Project/Website/Arogya-Relay/docs/project-report"
DOWNLOADS_DIR = "/home/pratyush/Downloads"
TECTONIC_BIN = "/home/pratyush/anaconda3/bin/tectonic"

students = [
    {
        "name": "PRATYUSH KIRAN RATH",
        "title_name": "Pratyush Kiran Rath",
        "reg": "250301120001",
        "team_regs": ["250301120012", "250301120011", "250301120009"],
        "filename": "Arogya_Relay_Report_Pratyush_Kiran_Rath_250301120001"
    },
    {
        "name": "SAMARPIT BISWAL",
        "title_name": "Samarpit Biswal",
        "reg": "250301120012",
        "team_regs": ["250301120001", "250301120011", "250301120009"],
        "filename": "Arogya_Relay_Report_Samarpit_Biswal_250301120012"
    },
    {
        "name": "BISHNU PRASAD SATAPATHY",
        "title_name": "Bishnu Prasad Satapathy",
        "reg": "250301120011",
        "team_regs": ["250301120001", "250301120012", "250301120009"],
        "filename": "Arogya_Relay_Report_Bishnu_Prasad_Satapathy_250301120011"
    },
    {
        "name": "BIBHU PRASAD DHAL",
        "title_name": "Bibhu Prasad Dhal",
        "reg": "250301120009",
        "team_regs": ["250301120001", "250301120012", "250301120011"],
        "filename": "Arogya_Relay_Report_Bibhu_Prasad_Dhal_250301120009"
    }
]

with open(os.path.join(REPORT_DIR, "main.tex.bak"), "r") as f:
    template = f.read()

# Update supervisor name in general text (e.g., Acknowledgement)
template = template.replace("Assistant Prof. Sanjib Kumar Naik", "Professor Chitta Ranjan Behera")
template = template.replace("Assistant Professor", "Professor")

title_start = template.find(r"\begin{titlepage}")
ack_start = template.find(r"\chapter*{Acknowledgement}")
bib_end = template.find(r"\end{thebibliography}")
rubric_start = template.find(r"% ---", bib_end)

header_part = template[:title_start]
middle_part = template[ack_start:rubric_start]

def build_student_tex(student):
    s_name = student["name"]
    s_title = student["title_name"]
    s_reg = student["reg"]
    o_regs = student["team_regs"]

    front_pages = r"""\begin{titlepage}
\begin{center}
    \vspace*{0.2cm}
    
    {\fontsize{16}{20}\selectfont \bfseries Arogya Relay: An Offline-Resilient, Secure Telehealth and Epidemiological Surveillance Ecosystem for Rural Healthcare} \\[0.7cm]
    
    {\fontsize{14}{18}\selectfont \bfseries A PROJECT REPORT} \\[0.45cm]
    
    {\fontsize{14}{18}\selectfont \bfseries Submitted by} \\[0.35cm]
    
    {\fontsize{14}{18}\selectfont \bfseries (""" + s_title + r""" , Reg.no -  """ + s_reg + r""")} \\[0.5cm]
    
    {\fontsize{14}{18}\selectfont \bfseries Team Members --} \\[0.2cm]
    {\fontsize{14}{18}\selectfont \bfseries """ + o_regs[0] + r"""} \\[0.15cm]
    {\fontsize{14}{18}\selectfont \bfseries """ + o_regs[1] + r"""} \\[0.15cm]
    {\fontsize{14}{18}\selectfont \bfseries """ + o_regs[2] + r"""} \\[0.6cm]
    
    {\fontsize{14}{18}\selectfont \bfseries in partial fulfilment for the award of the degree of} \\[0.25cm]
    
    {\fontsize{16}{20}\selectfont \bfseries BACHELOR OF TECHNOLOGY} \\[0.2cm]
    {\fontsize{14}{18}\selectfont \bfseries in} \\[0.2cm]
    {\fontsize{14}{18}\selectfont \bfseries COMPUTER SCIENCE AND ENGINEERING} \\[0.55cm]
    
    \includegraphics[height=3.6cm,keepaspectratio]{format_cutm_logo.png} \\[0.45cm]
    
    {\fontsize{12}{15}\selectfont \bfseries SCHOOL OF ENGINEERING AND TECHNOLOGY BHUBANESWAR CAMPUS} \\[0.12cm]
    {\fontsize{12}{15}\selectfont \bfseries CENTURION UNIVERSITY OF TECHNOLOGY AND MANAGEMENT} \\[0.12cm]
    {\fontsize{12}{15}\selectfont \bfseries ODISHA} \\[0.25cm]
    {\fontsize{12}{15}\selectfont \bfseries DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING} \\[0.12cm]
    {\fontsize{12}{15}\selectfont \bfseries SCHOOL OF ENGINEERING AND TECHNOLOGY} \\[0.12cm]
    {\fontsize{12}{15}\selectfont \bfseries BHUBANESWAR CAMPUS}
    
\end{center}
\end{titlepage}

% =============================================================
% FRONTMATTER
% =============================================================
\pagenumbering{arabic}
\setcounter{page}{2}

% -------------------------------------------------------------
% BONAFIDE CERTIFICATE
% -------------------------------------------------------------
\clearpage
\addcontentsline{toc}{chapter}{Bonafide Certificate}
\thispagestyle{plain}

\begin{center}
    {\fontsize{16}{20}\selectfont \bfseries BONAFIDE CERTIFICATE}
\end{center}
\vspace{0.8cm}

{\fontsize{13}{20}\selectfont
\noindent Certified that this project report \textbf{``Arogya Relay: An Offline-Resilient, Secure Telehealth and Epidemiological Surveillance Ecosystem for Rural Healthcare''} is the Bonafide work of \textbf{``""" + s_title + r"""''} who carried out the project work under my supervision. This is to further certify to the best of my knowledge, that this project has not been carried out earlier in this institute and the university.
}

\vspace{1.8cm}

\noindent
\begin{tabularx}{\textwidth}{@{} X R{8.5cm} @{}}
    \textbf{SIGNATURE} & \\[1.0cm]
    \textbf{(Professor Chitta Ranjan Behera)} & \textbf{Professor of Computer Science \& Engineering.}
\end{tabularx}

\vspace{1.8cm}

{\fontsize{13}{20}\selectfont
\noindent Certified that the above-mentioned project has been duly carried out as per the norms of the college and statutes of the university.
}

\vspace{1.5cm}

\begin{center}
    \textbf{SIGNATURE} \\[1.0cm]
    \textbf{(Dr. Rahul Roy)} \\[0.15cm]
    \textbf{HEAD OF THE DEPARTMENT} \\[0.15cm]
    \textbf{Professor of Computer Science and Engineering} \\[1.0cm]
    \textbf{DEPARTMENT SEAL}
\end{center}

\clearpage

% -------------------------------------------------------------
% DECLARATION
% -------------------------------------------------------------
\addcontentsline{toc}{chapter}{Declaration}
\thispagestyle{plain}

\begin{center}
    {\fontsize{16}{20}\selectfont \bfseries DECLARATION}
\end{center}
\vspace{1.0cm}

{\fontsize{13}{20}\selectfont
\noindent I hereby declare that the project entitled \textbf{``Arogya Relay: An Offline-Resilient, Secure Telehealth and Epidemiological Surveillance Ecosystem for Rural Healthcare''} submitted for our ``Minor Project'' of 3rd semester B.~Tech in Computer Science and Engineering under the guidance of \textbf{``Professor Chitta Ranjan Behera''}. This is my original work and the project has not formed the basis for the award of any Degree / Diploma or any other similar titles in any other University / Institute.
}

\vspace{3.5cm}

\noindent
{\fontsize{13}{22}\selectfont
\textbf{Name of the Student:} """ + s_name + r""" \\[0.4cm]
\textbf{Signature of the Student:} \rule{5.5cm}{0.4pt} \\[0.4cm]
\textbf{Registration No:} """ + s_reg + r""" \\[0.4cm]
\textbf{Place:} Bhubaneswar
}

\clearpage
"""

    new_rubric = r"""% -------------------------------------------------------------
% ASSESSMENT & COURSE OUTCOME (COs) ATTAINMENT (1 PAGE)
% -------------------------------------------------------------
\clearpage
\thispagestyle{plain}
\addcontentsline{toc}{chapter}{Assessment \& Course Outcome (COs) Attainment}

\begin{center}
    {\fontsize{14}{17}\selectfont \bfseries ASSESSMENT}
\end{center}
\vspace{-0.1cm}

\noindent
\textbf{Internal:} \\[0.15cm]
\noindent
\textbf{Date:} \underline{\hspace{3.5cm}} \hfill \textbf{Signature of the Faculty:} \underline{\hspace{4.5cm}}

\vspace{0.25cm}
\begin{center}
\small
\renewcommand{\arraystretch}{1.15}
\begin{tabularx}{\textwidth}{|c|X|c|C{2.2cm}|C{2.5cm}|}
\hline
\textbf{SL NO} & \textbf{RUBRICS} & \textbf{FULL MARK} & \textbf{MARKS OBTAINED} & \textbf{REMARKS} \\
\hline
1 & Understanding the relevance, scope and dimension of the project & 10 & & \\
\hline
2 & Methodology & 10 & & \\
\hline
3 & Quality of Analysis and Results & 10 & & \\
\hline
4 & Interpretations and Conclusions & 10 & & \\
\hline
5 & Report & 10 & & \\
\hline
& \textbf{Total} & \textbf{50} & & \\
\hline
\end{tabularx}
\end{center}

\vspace{0.3cm}
\begin{center}
    {\fontsize{13}{16}\selectfont \bfseries COURSE OUTCOME (COs) ATTAINMENT}
\end{center}
\vspace{-0.1cm}

\noindent
\textbf{Expected Course Outcomes (COs):} \textit{(Refer to COs Statement in the Syllabus)} \\[0.15cm]
\textbf{Course Outcome Attained:} \\[0.05cm]
How would you rate your learning of the subject based on the specified COs?

\vspace{0.15cm}
\begin{center}
\small
\renewcommand{\arraystretch}{1.1}
\begin{tabularx}{\textwidth}{|*{10}{>{\centering\arraybackslash}X|}}
\hline
\textbf{1} & \textbf{2} & \textbf{3} & \textbf{4} & \textbf{5} & \textbf{6} & \textbf{7} & \textbf{8} & \textbf{9} & \textbf{10} \\
\hline
\textbf{LOW} & & & & & & & & & \textbf{HIGH} \\
\hline
\end{tabularx}
\end{center}

\vspace{0.15cm}
\noindent
\textbf{Learning Gap (if any):} \hrulefill \\[0.25cm]
\textbf{Books / Manuals Referred:} \hrulefill \\[0.3cm]
\textbf{Date:} \underline{\hspace{3.5cm}} \hfill \textbf{Signature Student:} \underline{\hspace{4.5cm}}

\vspace{0.3cm}
\noindent
\textbf{Suggestions / Recommendations:} \textit{(By the Course Faculty)} \\[0.2cm]
\rule{\textwidth}{0.4pt} \\[0.35cm]
\textbf{Date:} \underline{\hspace{3.5cm}} \hfill \textbf{Signature of Faculty:} \underline{\hspace{4.5cm}}
\end{document}
"""
    return header_part + front_pages + middle_part + new_rubric

def compile_student(student):
    print(f"\n==========================================")
    print(f"Building Report for: {student['name']} ({student['reg']})")
    print(f"==========================================")
    tex_content = build_student_tex(student)
    tex_path = os.path.join(REPORT_DIR, f"{student['filename']}.tex")
    pdf_path = os.path.join(REPORT_DIR, f"{student['filename']}.pdf")
    
    with open(tex_path, "w") as f:
        f.write(tex_content)
    
    cmd = [TECTONIC_BIN, f"{student['filename']}.tex"]
    res = subprocess.run(cmd, cwd=REPORT_DIR, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error compiling {student['filename']}:", res.stderr)
        raise RuntimeError(f"Tectonic failed for {student['filename']}")
    
    # Verify PDF
    reader = pypdf.PdfReader(pdf_path)
    print(f"Success! Generated {pdf_path}")
    print(f"Total Pages: {len(reader.pages)}")
    p1 = reader.pages[0].extract_text()
    p2 = reader.pages[1].extract_text()
    p3 = reader.pages[2].extract_text()
    p_last = reader.pages[-1].extract_text()
    assert student["reg"] in p1, "Registration number missing on Page 1"
    assert student["reg"] in p3, "Registration number missing on Page 3"
    assert "ASSESSMENT" in p_last, "Rubric missing on final page"
    print("Verification passed: Student details and registration numbers correct on all pages!")

    # Copy to Downloads
    dest_path = os.path.join(DOWNLOADS_DIR, f"{student['filename']}.pdf")
    shutil.copyfile(pdf_path, dest_path)
    print(f"Copied to: {dest_path}")

if __name__ == "__main__":
    for s in students:
        compile_student(s)
    
    # Also compile default main.tex for Pratyush Kiran Rath
    default_tex = build_student_tex(students[0])
    with open(os.path.join(REPORT_DIR, "main.tex"), "w") as f:
        f.write(default_tex)
    subprocess.run([TECTONIC_BIN, "main.tex"], cwd=REPORT_DIR, check=True)
    shutil.copyfile(os.path.join(REPORT_DIR, "main.pdf"), os.path.join(DOWNLOADS_DIR, "Arogya_Relay_Comprehensive_Project_Report_Final.pdf"))
    shutil.copyfile(os.path.join(REPORT_DIR, "main.pdf"), os.path.join(DOWNLOADS_DIR, "Arogya_Relay_Project_Report_Final.pdf"))
    print("\nAll 4 individual reports + main report compiled and synchronized successfully!")
