// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

//#define LOG_FUSES

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;
using static System.Net.Mime.MediaTypeNames;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the GAL chip GAL16V8.
    /// </summary>
    public class GAL16V8 : BaseElement, ILoadable
    {
        // Datasheet https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-0364-PLD-ATF16V8B-8BQ-8BQL-Datasheet.pdf

        // https://ece-classes.usc.edu/ee459/library/datasheets/16v8.pdf
        // https://blog.frankdecaire.com/2017/01/22/generic-array-logic-devices/
        // https://k1.spdns.de/Develop/Projects/GalAsm/info/galer/jedecfile.html
        // https://mil.ufl.edu/4712/docs/introgal.pdf
        // https://bitsavers.trailing-edge.com/components/mmi/palasm_pleasm/PALASM_2_Software_Jul87.pdf
        // https://ww1.microchip.com/downloads/en/DeviceDoc/doc0737.pdf

        // fuse addresses:
        //GAL16V8, GA16V8A, GAL16V8B:
        //  0000 - 2047: matrix of fuses(AND-array)
        //  2048-2055: XOR bits
        //  2056-2119: signature
        //  2120-2127: AC1 bits
        //  2128-2191: product term disable bits
        //  2192     : SYN bit
        //  2193     : AC0 bit


        private const double TYP_PROPAGATION_DELAY = 4;

        #region Internal Constants
        /// <summary>Definition of the Start-of-Text code used in jedec files.</summary>
        internal const char STX = (char)2;
        /// <summary>Definition of the End-of-Text code used in jedec files.</summary>
        internal const char ETX = (char)3;

        /// <summary>Number of general IO pins excluding the special function pins CLK and OE.</summary>
        internal const int NO_OF_IOS = 16;
        /// <summary>Number of macrocells in the chip that can generate outputs.</summary>
        internal const int NO_OF_CELLS = 8;
        /// <summary>Number of all in and out pins including CLK and OE</summary>
        internal const int NO_OF_PINS = NO_OF_IOS + 2;

        /// <summary>Index of the CLK pin in the Pin array.</summary>
        internal const int IDX_CLK = 0;
        /// <summary>Index of the OE pin in the Pin array.</summary>
        internal const int IDX_OE = 9;

        /// <summary>Number of columns in the AND matrix, all IOs as non-inverted and inverted.</summary>
        internal const int AND_COLS = NO_OF_IOS * 2;
        /// <summary>The number of fixed AND rows for each macrocell or term.</summary>
        internal const int AND_ROWS_PER_TERM = 8;
        /// <summary>Total size of all AND array fuses.</summary>
        internal const int AND_SIZE = AND_COLS * NO_OF_CELLS * AND_ROWS_PER_TERM;

        /// <summary>Start address of the xor fuses.</summary>
        internal const int XOR_START = AND_SIZE;
        /// <summary>Size of the xor fuse area.</summary>
        internal const int XOR_SIZE = NO_OF_CELLS;

        /// <summary>Start address of the signature fuses. Not used here.</summary>
        internal const int SIGNATURE_START = XOR_START + XOR_SIZE;
        /// <summary>Size of the signature fuse area. Not used here.</summary>
        internal const int SIGNATURE_SIZE = 64;

        /// <summary>Start address of the AC1 fuses.</summary>
        internal const int AC1_START = SIGNATURE_START + SIGNATURE_SIZE;
        /// <summary>Size of the AC1 fuse area.</summary>
        internal const int AC1_SIZE = NO_OF_CELLS;

        /// <summary>Start address of the product term disable fuses.</summary>
        internal const int TERM_DIS_START = AC1_START + AC1_SIZE;
        /// <summary>Size of the product term disable fuse area.</summary>
        internal const int TERM_DIS_SIZE = 64;

        /// <summary>Address of the global SYN fuse.</summary>
        internal const int SYN_ADDR = TERM_DIS_START + TERM_DIS_SIZE;
        /// <summary>Address of the global AC0 fuse.</summary>
        internal const int AC0_ADDR = SYN_ADDR + 1;

        /// <summary>Number of all fuses together.</summary>
        internal const int NO_OF_FUSES = AC0_ADDR + 1;

        /// <summary>Definitions of the indices of the pins as fed into the AND matrix columns.</summary>
        private int[] PIN_IDX = { 1, 0, 2, 16, 3, 15, 4, 14, 5, 13, 6, 12, 7, 11, 8, 9 };
        #endregion Internal Constants

        #region Internal Fields
        /// <summary>File name used in LoadContents.</summary>
        private string fileName;

        /// <summary>Global SYN fuse of the Gal16V8 chip determining the mode together with AC0</summary>
        internal byte syn;
        /// <summary>Global AC0 fuse of the Gal16V8 chip determining the mode together with SYN</summary>
        internal byte ac0;
        /// <summary>Last clock input state from previous simulation step, used to detect the rising edge.</summary>
        internal bool lastCLK;

        /// <summary>Array of connector objects used to get the state of internal or external states for processing the AND matrix.</summary>
        internal MatrixConnector[] connectors;
        /// <summary>Array of macrocell objects.</summary>
        internal Cell[] cells;
        /// <summary>Global OLMC configuration mode defined by SYN and AC0.</summary>
        internal CfgMode mode;
        #endregion Internal Fields

        #region Internal Classes and Definitions
        /// <summary>
        /// Enumeration of the basic modes of the GAL16V8.
        /// </summary>
        internal enum CfgMode
        {
            SimpleMode,
            ComplexMode,
            RegisteredMode,
            Undefined
        }

        /// <summary>
        /// Implementation of the Gal16v8 macrocell.
        /// </summary>
        internal class Cell
        {
            /// <summary>Array of all And fuses for this macrocell. The dimensions are rows,cols,non-inv/inverted</summary>
            internal byte[][][] and_fuses;
            /// <summary>Product Term Disable fuses for the rows.</summary>
            internal byte[] ptd_fuses;
            /// <summary>AC1 fuse.</summary>
            internal byte ac1;
            /// <summary>XOR fuse.</summary>
            internal byte xor;

            /// <summary>Reference to the output pin of this cell.</summary>
            private Pin outPin;
            /// <summary>Reference to the owner object.</summary>
            private GAL16V8 owner;
            /// <summary>Index of this cell object in the owner's cell array. Can be helpful in debugging.</summary>
            private int cellIdx;
            /// <summary>Array for the individual row AND results.</summary>
            private bool[] and_result;
            /// <summary>OR result direct or inverted.</summary>
            private bool or_result;
            /// <summary>Final result registered or not.</summary>
            private bool result;

            /// <summary>
            /// Creates the macrocell instance and initialize the fields.
            /// </summary>
            /// <param name="Owner">Reference to the owner object of this macrocell.</param>
            /// <param name="CellIdx">Index of this cell object in the owner's cell array. Can be helpful in debugging.</param>
            /// <param name="OutPin">Reference to the output pin of this cell.</param>
            public Cell(GAL16V8 Owner, int CellIdx, Pin OutPin)
            {
                owner = Owner;
                cellIdx = CellIdx;
                outPin = OutPin;

                and_fuses = new byte[GAL16V8.AND_ROWS_PER_TERM][][];
                for (int i = 0; i < GAL16V8.AND_ROWS_PER_TERM; i++)
                {
                    and_fuses[i] = new byte[GAL16V8.NO_OF_IOS][];
                    for (int j = 0; j < GAL16V8.NO_OF_IOS; j++)
                    {
                        and_fuses[i][j] = new byte[2];
                        for (int k = 0; k < 2; k++)
                            and_fuses[i][j][k] = 0;
                    }
                }
                and_result = new bool[GAL16V8.AND_ROWS_PER_TERM];
                ptd_fuses = new byte[GAL16V8.AND_ROWS_PER_TERM];
            }

            /// <summary>
            /// Get the cell specific logic state of the macrocell to be used in the matrix.
            /// </summary>
            /// <param name="Inv">0: not inverted,  1: inverted</param>
            /// <returns>Logic level of the connection.</returns>
            internal bool GetState(int Inv)
            {
                if ((owner.mode == CfgMode.RegisteredMode) && (ac1 == 0))
                    return (Inv == 0) ? result : !result;
                else
                    return (Inv == 0) ? (outPin.State == SignalState.H) : !(outPin.State == SignalState.H);
            }

            /// <summary>
            /// Simulation step one to calculate the AND and OR terms until applying the xor-inversion. Eventual feedbacks into the AND matrix are not affected here.
            /// </summary>
            public void SimulateStep1()
            {
                or_result = false;
                for (int i = 0; i < GAL16V8.AND_ROWS_PER_TERM; i++)
                {
                    and_result[i] = owner.ProcessAndRow(and_fuses[i]);

                    if ((owner.mode != CfgMode.ComplexMode) || (i > 0))
                    {
                        if (ptd_fuses[i] == 1)
                            or_result |= and_result[i];
                    }
                }

                if (xor == 0)
                    or_result = !or_result;
            }

            /// <summary>
            /// Simulation step two to handle registering and outputs including eventual feedbacks into the AND matrix.
            /// </summary>
            public void SimulateStep2()
            {
                switch (owner.mode)
                {
                    case CfgMode.RegisteredMode:
                        if (ac1 == 0)
                        {
                            if ((owner.lastCLK == false) && (owner.CLK == true))
                                result = or_result;
                        }
                        if (owner.OE == false)
                            outPin.NewOutState = result ? SignalState.H : SignalState.L;
                        else
                            outPin.NewOutState = SignalState.Z;
                        break;

                    case CfgMode.ComplexMode:
                        result = or_result;
                        if (and_result[0])
                            outPin.NewOutState = result ? SignalState.H : SignalState.L;
                        else
                            outPin.NewOutState = SignalState.Z;
                        break;

                    default:
                        result = or_result;
                        if (ac1 == 0)
                            outPin.NewOutState = result ? SignalState.H : SignalState.L;
                        else
                            outPin.NewOutState = SignalState.Z;
                        break;
                }
            }


        }


        /// <summary>
        /// A special connector class to link inputs into the matrix.
        /// </summary>
        internal class MatrixConnector
        {
            /// <summary>Reference to the owner object.</summary>
            internal GAL16V8 owner;
            /// <summary>Index of this connector object in the owner's array. Can be helpful in debugging.</summary>
            internal int connIdx;
            /// <summary>Reference to the input pin object that feeds into the matrix.</summary>
            internal Pin pin;
            /// <summary>Reference to the macrocell object if exists. The cell object gives access to the cell output.</summary>
            internal Cell cell;

            /// <summary>
            /// Creates the inctance of the connector class.
            /// </summary>
            /// <param name="Owner">Reference to the owner object.</param>
            /// <param name="ConnectorIdx">Index of this connector object in the owner's array. Can be helpful in debugging.</param>
            /// <param name="Pin">Reference to the input pin object that feeds into the matrix.</param>
            /// <param name="Cell">Reference to the macrocell object if exists. The cell object gives access to the cell output.</param>
            public MatrixConnector(GAL16V8 Owner, int ConnectorIdx, Pin Pin, Cell Cell)
            {
                this.owner = Owner;
                this.connIdx = ConnectorIdx;
                this.pin = Pin;
                this.cell = Cell;
            }


            /// <summary>
            /// Get the specific logic state of the connection to be used in the matrix.
            /// </summary>
            /// <param name="Inv">0: not inverted,  1: inverted</param>
            /// <returns>Logic level of the connection.</returns>
            public bool GetState(int Inv)
            {
                if (cell == null)
                {
                    if ((pin.PinNo == "1") && (owner.mode == CfgMode.RegisteredMode))
                        return (Inv == 0) ? owner.lastCLK : !owner.lastCLK;
                    else
                        return (Inv == 0) ? (pin.State == SignalState.H) : !(pin.State == SignalState.H);
                }
                else
                    return cell.GetState(Inv);
            }
        }

        /// <summary>Array of all I/O pins of the chip. </summary>
        private Pin[] pins;
        #endregion Internal Classes and Definitions

        #region Input Pins
        public Pin I1;
        public Pin I2;
        public Pin I3;
        public Pin I4;
        public Pin I5;
        public Pin I6;
        public Pin I7;
        public Pin I8;
        public Pin I9;
        public Pin I10;
        #endregion Input Pins

        #region Input/Output Pins
        public Pin IO1;
        public Pin IO2;
        public Pin IO3;
        public Pin IO4;
        public Pin IO5;
        public Pin IO6;
        public Pin IO7;
        public Pin IO8;
        #endregion Input/Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public GAL16V8(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public GAL16V8(string Name, Net NetI1, Net NetI2, Net NetI3, Net NetI4, Net NetI5, Net NetI6, Net NetI7, Net NetI8, Net NetI9, Net NetI10) : base(Name)
        {
            this.fileName = "";
            this.Power[0] = new Pin(this, "VCC", "20");
            this.Ground[0] = new Pin(this, "GND", "10");

            this.I1  = new Pin(this,  "I1",  "1", LineMode.In, SignalState.L, NetI1);
            this.I2  = new Pin(this,  "I2",  "2", LineMode.In, SignalState.L, NetI2);
            this.I3  = new Pin(this,  "I3",  "3", LineMode.In, SignalState.L, NetI3);
            this.I4  = new Pin(this,  "I4",  "4", LineMode.In, SignalState.L, NetI4);
            this.I5  = new Pin(this,  "I5",  "5", LineMode.In, SignalState.L, NetI5);
            this.I6  = new Pin(this,  "I6",  "6", LineMode.In, SignalState.L, NetI6);
            this.I7  = new Pin(this,  "I7",  "7", LineMode.In, SignalState.L, NetI7);
            this.I8  = new Pin(this,  "I8",  "8", LineMode.In, SignalState.L, NetI8);
            this.I9  = new Pin(this,  "I9",  "9", LineMode.In, SignalState.L, NetI9);
            this.I10 = new Pin(this, "I10", "11", LineMode.In, SignalState.L, NetI10);

            this.IO1 = new Pin(this, "IO1", "19", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO2 = new Pin(this, "IO2", "18", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO3 = new Pin(this, "IO3", "17", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO4 = new Pin(this, "IO4", "16", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO5 = new Pin(this, "IO5", "15", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO6 = new Pin(this, "IO6", "14", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO7 = new Pin(this, "IO7", "13", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO8 = new Pin(this, "IO8", "12", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[1][];
            SetPinArray(Inputs, 0, new Pin[] { this.I1, this.I2, this.I3, this.I4, this.I5, this.I6, this.I7, this.I8, this.I9, this.I10});

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, new Pin[] { this.IO1, this.IO2, this.IO3, this.IO4, this.IO5, this.IO6, this.IO7, this.IO8 });


            pins = new Pin[] { this.I1, this.I2, this.I3, this.I4, this.I5, this.I6, this.I7, this.I8, this.I9, this.I10, this.IO8, this.IO7, this.IO6, this.IO5, this.IO4, this.IO3, this.IO2, this.IO1 };

            cells = new Cell[NO_OF_CELLS];
            for (int i = 0; i < NO_OF_CELLS; i++)
                cells[i] = new Cell(this, i, pins[NO_OF_PINS - 1 - i]);

            connectors = new MatrixConnector[NO_OF_IOS];
            for (int i = 0; i < NO_OF_IOS; i++)
            {
                Cell cell = null;
                int cellIdx = NO_OF_PINS - 1 - PIN_IDX[i];
                if (cellIdx < NO_OF_CELLS)
                    cell = cells[cellIdx];
                connectors[i] = new MatrixConnector(this, i, pins[PIN_IDX[i]], cell);
            }

            mode = CfgMode.Undefined;
        }
        #endregion Constructors

        #region Internal Methods and Properties
        /// <summary>
        /// Process one AND row of the matrix by checking the fuses and anding the matrix inputs depending on the fuse settings.
        /// </summary>
        /// <param name="fuses">Fuse array of one row with non-inverted and inverted inputs as second dimension.</param>
        /// <returns>AND result.</returns>
        internal bool ProcessAndRow(byte[][] fuses)
        {
            bool and_result = true;
            for (int i = 0; i < NO_OF_IOS; i++)
            {
                for (int j = 0; j < 2; j++)
                    if (fuses[i][j] == 0)
                        and_result &= connectors[i].GetState(j);
            }
            return and_result;
        }

#if LOG_FUSES
        /// <summary>
        /// Logs all fuses to a csv file for verification.
        /// </summary>
        /// <param name="fuses">Linear fuse array as read in from the jedec file.</param>
        /// <param name="FileName">Full file name to the csv output file.</param>
        private void LogFuses(byte[] fuses, string FileName)
        {
            StreamWriter sw = new StreamWriter(FileName);
            sw.Write("Pin Idx,,");
            for (int i = 0; i < NO_OF_IOS; i++)
                sw.Write(PIN_IDX[i].ToString() + ",_,");
            sw.WriteLine();
            sw.WriteLine();

            sw.Write("Pin No,,");
            for (int i = 0; i < NO_OF_IOS; i++)
                sw.Write(Pins[PIN_IDX[i]].PinNo.ToString() + ",_,");
            sw.WriteLine();
            sw.WriteLine();

            int idx = 0;
            for (int i = 0; i < NO_OF_CELLS; i++)
            {
                sw.WriteLine("Block " + i.ToString());
                for (int j = 0; j < AND_ROWS_PER_TERM; j++)
                {
                    sw.Write(idx.ToString() + ",,");
                    for (int k = 0; k < AND_COLS; k++)
                        sw.Write(fuses[idx++].ToString() + ",");
                    sw.WriteLine();
                }
                sw.WriteLine();
            }

            sw.WriteLine("Xor");
            sw.Write(idx.ToString() + ",,");
            for (int i = 0; i < NO_OF_CELLS; i++)
                sw.Write(fuses[idx++].ToString() + ",");
            sw.WriteLine();
            sw.WriteLine();

            idx = 2120;
            sw.WriteLine("AC1");
            sw.Write(idx.ToString() + ",,");
            for (int i = 0; i < NO_OF_CELLS; i++)
                sw.Write(fuses[idx++].ToString() + ",");
            sw.WriteLine();
            sw.WriteLine();

            for (int i = 0; i < NO_OF_CELLS; i++)
            {
                sw.WriteLine("ptd " + i.ToString());
                sw.Write(idx.ToString() + ",,");
                for (int j = 0; j < AND_ROWS_PER_TERM; j++)
                    sw.Write(fuses[idx++].ToString() + ",");
                sw.WriteLine();
            }
            sw.WriteLine();

            sw.WriteLine("SYN");
            sw.WriteLine(idx.ToString() + ",," + fuses[idx++].ToString());
            sw.WriteLine();

            sw.WriteLine("AC0");
            sw.WriteLine(idx.ToString() + ",," + fuses[idx++].ToString());
            sw.WriteLine();

            sw.Close();
        }
#endif
        /// <summary>
        /// State of the Clock pin for the registered mode.
        /// </summary>
        internal bool CLK
        {
            get
            {
                if (mode == CfgMode.RegisteredMode)
                    return pins[IDX_CLK].State == SignalState.H;
                else
                    return false;
            }
        }

        /// <summary>
        /// State of the output enable pin for the registered mode.
        /// </summary>
        internal bool OE
        {
            get
            {
                if (mode == CfgMode.RegisteredMode)
                    return pins[IDX_OE].State == SignalState.H;
                else
                    return false;
            }
        }
        #endregion Internal Methods and Properties

        #region Public Methods
        /// <summary>
        /// Load a jedec file to read the fuse contents. Initially, the file is read to fill a linear fuse array, which is then distributed to the cell fuse arrays.
        /// </summary>
        /// <param name="FileName">Full file name of the jedec file to be read.</param>
        /// <exception cref="Exception">Exceptions are thrown for device mismatch or total fuse count mismatch.</exception>
        public void LoadContents(string FileName)
        {
            fileName = FileName;
            byte[] fuses = new byte[NO_OF_FUSES];
            for (int i = 0; i < NO_OF_FUSES; i++)
                fuses[i] = 0;

            StreamReader sr = new StreamReader(FileName);
            bool endOfText = false;
            while ((sr.EndOfStream == false) && (endOfText == false))
            {
                string line = sr.ReadLine();

                if (line[0] == '*')
                {
                    line = line.Substring(1);
                    if (line[0] == ETX)
                        endOfText = true;
                    else if (line.StartsWith("QP"))
                    {
                    }
                    else if (line.StartsWith("QF"))
                    {
                        if (Convert.ToInt32(line.Substring(2)) != NO_OF_FUSES)
                            throw new Exception("Number of total fuses doesn't match !\n" + line.Substring(2) + " vs " + NO_OF_FUSES.ToString());
                    }
                    else if (line.StartsWith("G"))
                    {
                        // Security fuse 
                    }
                    else if (line.StartsWith("F"))
                    {
                        for (int i = 0; i < NO_OF_FUSES; i++)
                            fuses[i] = Convert.ToByte(line.Substring(1, 1));
                    }
                    else if (line.StartsWith("L"))
                    {
                        line = line.Substring(1);
                        string[] s = line.Split(new char[] { ' ' });

                        int startAddr = Convert.ToInt32(s[0].Trim());
                        string fuseLine = s[1].Trim(new char[] { ' ', '*' });
                        for (int i = 0; i < fuseLine.Length; i++)
                            fuses[startAddr + i] = Convert.ToByte(fuseLine.Substring(i, 1));
                    }
                }
                else if (line.ToLower().StartsWith("device"))
                {
                    int p = line.IndexOf(' ');
                    if (p > 0)
                    {
                        line = line.Substring(p).Trim(new char[] { ' ', '\t' });
                        p = line.IndexOf(' ');
                        line = line.Substring(0, p).Trim(new char[] { ' ', '\t' });
                    }
                    if (line.ToLower().StartsWith("g16v8") == false)
                        throw new Exception("Jedec file does not seem to be for Gal 16V8 !\nDevice: " + line);
                }
            }
            sr.Close();

#if LOG_FUSES
            try { LogFuses(fuses, Application.StartupPath + "\\" + Path.ChangeExtension(Path.GetFileName(FileName), "Fuses.csv")); }
            catch { }
#endif

            for (int i = 0; i < NO_OF_CELLS; i++)
            {
                int idx1 = i * AND_ROWS_PER_TERM;

                for (int j = 0; j < AND_ROWS_PER_TERM; j++)
                {
                    int idx2 = idx1 * AND_COLS + j * AND_COLS;

                    for (int k = 0; k < NO_OF_IOS; k++)
                        for (int l = 0; l < 2; l++)
                            cells[i].and_fuses[j][k][l] = fuses[idx2++];

                    cells[i].ptd_fuses[j] = fuses[TERM_DIS_START + idx1 + j];
                }
                cells[i].xor = fuses[XOR_START + i];
                cells[i].ac1 = fuses[AC1_START + i];
            }

            syn = fuses[SYN_ADDR];
            ac0 = fuses[AC0_ADDR];

            if ((syn == 1) && (ac0 == 0))
                mode = CfgMode.SimpleMode;
            else if ((syn == 1) && (ac0 == 1))
                mode = CfgMode.ComplexMode;
            else if ((syn == 0) && (ac0 == 1))
                mode = CfgMode.RegisteredMode;
        }


        /// <summary>
        /// Return the file name passed in LoadContents
        /// </summary>
        /// <returns>File name used in LoadContents.</returns>
        public string GetFileName()
        {
            return this.fileName;
        }


        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);

            for (int i = 0; i < NO_OF_CELLS; i++)
                cells[i].SimulateStep1();

            for (int i = 0; i < NO_OF_CELLS; i++)
                cells[i].SimulateStep2();

            lastCLK = CLK;
        }
        #endregion Public Methods


    }
}