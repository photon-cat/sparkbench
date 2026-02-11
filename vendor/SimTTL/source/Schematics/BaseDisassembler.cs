// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;
using System.Windows.Forms;
using System.Diagnostics;

namespace Schematics
{
    /// <summary>
    /// A basic disassembler class to give a framework for the Mnemonic display in the signal graph.
    /// </summary>
    public class BaseDisassembler
    {
        /// <summary>Text column definition for the opcode.</summary>
        private const int COL_OPCODE = 0;
        /// <summary>Text column definition for the mnemonic.</summary>
        private const int COL_MNEMONIC = 1;
        /// <summary>Text column definition for the operand.</summary>
        private const int COL_OPERAND = 2;
        /// <summary>Text column definition for the number of bytes of the opcode.</summary>
        private const int COL_BYTES = 3;
        /// <summary>Full file name of the tab-separated text file.</summary>
        private string fileName;

        /// <summary>
        /// Class definition of one code element.
        /// </summary>
        private class CodeElement
        {
            /// <summary>The opcode of this element.</summary>
            public uint OpCode;
            /// <summary>The mnemonic string for the opcode.</summary>
            public string Mnemonic;
            /// <summary>The operand string for the opcode.</summary>
            public string Operand;
            /// <summary>The number of bytes belonging to the opcode.</summary>
            public int Bytes;

            /// <summary>
            /// Creates the CodeElement instance.
            /// </summary>
            /// <param name="OpCode">The opcode of this element.</param>
            /// <param name="Mnemonic">The mnemonic string for the opcode.</param>
            /// <param name="Operand">The operand string for the opcode.</param>
            /// <param name="Bytes">The number of bytes belonging to the opcode.</param>
            public CodeElement(uint OpCode, string Mnemonic, string Operand, int Bytes)
            {
                this.OpCode = OpCode;
                this.Mnemonic = Mnemonic;
                this.Operand = Operand;
                this.Bytes = Bytes;
            }   
        }

        /// <summary>List of code elements.</summary>
        private List<CodeElement> codes;

        /// <summary>
        /// Creates the instance of the BaseDisassembler.
        /// </summary>
        public BaseDisassembler() 
        { 
            codes = new List<CodeElement>();
            fileName = "";
        }

        /// <summary>
        /// Loads the contents from a text file with tab seperations for the columns.
        /// </summary>
        /// <param name="FileName">Full file name of the tab-separated text file.</param>
        public void LoadFile(string FileName)
        {
            fileName = FileName;
            try
            {
                StreamReader sr = new StreamReader(FileName);
                string line = sr.ReadLine();
                string[] header = line.Split('\t');
                codes.Clear();
                while (!sr.EndOfStream)
                {
                    line = sr.ReadLine();
                    string[] col = line.Split('\t');
                    if (col[COL_OPCODE] == "")
                        col[COL_OPCODE] = "?";

                    uint opCode = 0xFFFFFFFF;
                    try { opCode = Convert.ToUInt32(col[COL_OPCODE], 16); }
                    catch { }
                    int bytes = 0;
                    int.TryParse(col[COL_BYTES], out bytes);

                    CodeElement ce = new CodeElement(opCode, col[COL_MNEMONIC], col[COL_OPERAND], bytes);
                    codes.Add(ce);

                }
                sr.Close();
            }
            catch (Exception ex) { MessageBox.Show(ex.Message); }
        }

        /// <summary>
        /// Build the mnemonic string from the opcode without any parameters.
        /// </summary>
        /// <param name="OpCode">Opcode to be disassembled.</param>
        /// <returns>Mnemonic string related to the opcode.</returns>
        public string Disassembly(uint OpCode)
        {
            return Disassembly(OpCode, null);
        }

        /// <summary>
        /// Build the mnemonic string from the opcode with additional parameters.
        /// </summary>
        /// <param name="OpCode">Opcode to be disassembled.</param>
        /// <param name="Parms">Array of parameters.</param>
        /// <returns>Mnemonic string related to the opcode.</returns>
        public string Disassembly(uint OpCode, uint[] Parms)
        {
            if (OpCode < codes.Count)
            {
                if (OpCode == codes[(int)OpCode].OpCode)
                    return codes[(int)OpCode].Mnemonic;
            }

            int idx = 0;
            int step = codes.Count / 2;
            while(step>0)
            {
                if (OpCode == codes[idx + step].OpCode)
                    return codes[(int)OpCode].Mnemonic;

                if (OpCode > codes[idx + step].OpCode)
                        idx += step;

                step = Math.Max(step/2,1);
            }

            return "?";
        }

        /// <summary>
        /// True, if at least 2 code elements are present.
        /// </summary>
        public bool HasCodes
        {
            get { return codes.Count > 2; }
        }

        /// <summary>
        /// Full file name of the tab-separated text file.
        /// </summary>
        public string FileName
        {
            get { return fileName; }
        }
    }
}
