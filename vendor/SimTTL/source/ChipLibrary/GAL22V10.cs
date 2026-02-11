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
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the GAL chip GAL22V10.
    /// </summary>
    public class GAL22V10 : BaseElement, ILoadable
    {
        // Datasheet https://ww1.microchip.com/downloads/en/DeviceDoc/doc0735.pdf

        // http://ee6115.mit.edu/document/gal22v10.pdf
        // https://blog.frankdecaire.com/2017/01/22/generic-array-logic-devices/
        // https://blog.frankdecaire.com/2017/02/25/programming-the-gal22v10/
        // https://k1.spdns.de/Develop/Projects/GalAsm/info/galer/jedecfile.html
        // https://mil.ufl.edu/4712/docs/introgal.pdf
        // https://bitsavers.trailing-edge.com/components/mmi/palasm_pleasm/PALASM_2_Software_Jul87.pdf
        // https://ww1.microchip.com/downloads/en/DeviceDoc/doc0737.pdf

        // fuse addresses:
        //GAL22V10
        //  0000-5807: matrix of fuses(AND-array)
        //  5808-5827: S0 / S1 - bits of the OLMCs
        //  5828-5891: signature


        private const double TYP_PROPAGATION_DELAY = 4;

        #region Internal Constants
        /// <summary>Definition of the Start-of-Text code used in jedec files.</summary>
        internal const char STX = (char)2;
        /// <summary>Definition of the End-of-Text code used in jedec files.</summary>
        internal const char ETX = (char)3;

        /// <summary>Number of general IO pins.</summary>
        internal const int NO_OF_IOS = 22;
        /// <summary>Number of macrocells in the chip that can generate outputs.</summary>
        internal const int NO_OF_CELLS = 10;
        /// <summary>Number of all in and out pins including CLK and OE.</summary>
        internal const int NO_OF_PINS = NO_OF_IOS;

        /// <summary>Index of the CLK pin in the Pin array.</summary>
        internal const int IDX_CLK = 0;

        /// <summary>Number of columns in the AND matrix, all IOs as non-inverted and inverted.</summary>
        internal const int AND_COLS = NO_OF_IOS * 2;
        /// <summary>The cell specific numbers of fixed AND rows for each macrocell or term.</summary>
        internal int[] AND_ROWS_PER_TERM = { 8, 10, 12, 14, 16, 16, 14, 12, 10, 8 };
        /// <summary>The average number of fixed AND rows for each macrocell or term.</summary>
        internal const int AVG_AND_ROWS_PER_TERM = 12;
        /// <summary>Total size of all AND array fuses.</summary>
        internal const int AND_SIZE = AND_COLS * ((NO_OF_CELLS * (AVG_AND_ROWS_PER_TERM + 1)) + 2);

        /// <summary>Start address of the s-fuses for the macrocells.</summary>
        internal const int S_BITS_START = AND_SIZE;
        /// <summary>Size of the s-fuse area.</summary>
        internal const int S_BITS_SIZE = NO_OF_CELLS * 2;

        /// <summary>Start address of the signature fuses. Not used here.</summary>
        internal const int SIGNATURE_START = S_BITS_START + S_BITS_SIZE;
        /// <summary>Size of the AC1 fuse area.</summary>
        internal const int SIGNATURE_SIZE = 64;

        /// <summary>Number of all fuses together.</summary>
        internal const int NO_OF_FUSES = 5892;

        /// <summary>Definitions of the indices of the pins as fed into the AND matrix columns.</summary>
        private int[] PIN_IDX = { 0, 21, 1, 20, 2, 19, 3, 18, 4, 17, 5, 16, 6, 15, 7, 14, 8, 13, 9, 12, 10, 11 };
        #endregion Internal Constants

        #region Internal Fields
        /// <summary>File name used in LoadContents.</summary>
        private string fileName;

        /// <summary>Global register reset fuse array. The dimensions are cols and non-inv/inverted.</summary>
        private byte[][] and_res_fuses;
        /// <summary>Global register preset fuse array. The dimensions are cols and non-inv/inverted.</summary>
        private byte[][] and_pre_fuses;

        /// <summary>Reset term result.</summary>
        internal bool res;
        /// <summary>Preset term result.</summary>
        internal bool pre;
        /// <summary>Last clock input state from previous simulation step, used to detect the rising edge.</summary>
        internal bool lastCLK;

        /// <summary>Array of connector objects used to get the state of internal or external states for processing the AND matrix.</summary>
        internal MatrixConnector[] connectors;
        /// <summary>Array of macrocell objects.</summary>
        internal Cell[] cells;

        /// <summary>Array of all I/O pins of the chip. </summary>
        public Pin[] pins;
        #endregion Internal Fields

        #region Internal Classes and Definitions

        /// <summary>
        /// Implementation of the Gal22v10 macrocell.
        /// </summary>
        internal class Cell
        {
            /// <summary>Specific output enable fuse array. The dimensions are cols and non-inv/inverted.</summary>
            internal byte[][] oe_fuses;
            /// <summary>Array of all product term And fuses for this macrocell. The dimensions are rows,cols,non-inv/inverted.</summary>
            internal byte[][][] and_fuses;
            /// <summary>XOR fuse.</summary>
            internal byte xor;
            /// <summary>Registered mode fuse.</summary>
            internal byte reg;

            /// <summary>Reference to the output pin of this cell.</summary>
            private Pin outPin;
            /// <summary>Reference to the owner object.</summary>
            private GAL22V10 owner;
            /// <summary>Index of this cell object in the owner's cell array. Can be helpful in debugging.</summary>
            private int cellIdx;
            /// <summary>Number of AND rows for this macrocell.</summary>
            private int andRows;
            /// <summary>Output enable result.</summary>
            private bool oe;
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
            /// <param name="AndRows">Number of AND rows for this macrocell.</param>
            /// <param name="OutPin">Reference to the output pin of this cell.</param>
            public Cell(GAL22V10 Owner, int CellIdx, int AndRows, Pin OutPin)
            {
                owner = Owner;
                cellIdx = CellIdx;
                andRows = AndRows;
                outPin = OutPin;
                oe_fuses = new byte[GAL22V10.NO_OF_IOS][];
                for (int i = 0; i < GAL22V10.NO_OF_IOS; i++)
                {
                    oe_fuses[i] = new byte[2];
                    for (int j = 0; j < 2; j++)
                        oe_fuses[i][j] = 0;
                }

                and_fuses = new byte[AndRows][][];
                for (int i = 0; i < AndRows; i++)
                {
                    and_fuses[i] = new byte[GAL22V10.NO_OF_IOS][];
                    for (int j = 0; j < GAL22V10.NO_OF_IOS; j++)
                    {
                        and_fuses[i][j] = new byte[2];
                        for (int k = 0; k < 2; k++)
                            and_fuses[i][j][k] = 0;
                    }
                }
                and_result = new bool[AndRows];
            }

            /// <summary>
            /// Get the cell specific logic state of the macrocell to be used in the matrix.
            /// </summary>
            /// <param name="Inv">0: not inverted,  1: inverted</param>
            /// <returns>Logic level of the connection.</returns>
            internal bool GetState(int Inv)
            {
                if (reg == 0)
                    return (Inv == 0) ? !result : result;
                else
                    return (Inv == 0) ? (outPin.State == SignalState.H) : (outPin.State == SignalState.L);
            }

            /// <summary>
            /// Simulation step one to calculate the AND and OR terms until applying the xor-inversion. Eventual feedbacks into the AND matrix are not affected here.
            /// </summary>
            public void SimulateStep1()
            {
                oe = owner.ProcessAndRow(oe_fuses);

                or_result = false;
                for (int i = 0; i < andRows; i++)
                {
                    and_result[i] = owner.ProcessAndRow(and_fuses[i]);
                    or_result |= and_result[i];
                }

            }

            /// <summary>
            /// Simulation step two to handle registering and outputs including eventual feedbacks into the AND matrix.
            /// </summary>
            public void SimulateStep2()
            {
                if (reg == 0)
                {
                    if (owner.res)
                        result = false;
                    else if (owner.pre)
                        result = true;
                    else if ((owner.lastCLK == false) && (owner.CLK == true))
                        result = or_result;
                }
                else
                    result = or_result;

                if (oe)
                    outPin.NewOutState = (result ^ (xor == 0)) ? SignalState.H : SignalState.L;
                else
                    outPin.NewOutState = SignalState.Z;
            }
        }

        /// <summary>
        /// A special connector class to link inputs into the matrix.
        /// </summary>
        internal class MatrixConnector
        {
            /// <summary>Reference to the owner object.</summary>
            internal GAL22V10 owner;
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
            public MatrixConnector(GAL22V10 Owner, int ConnectorIdx, Pin Pin, Cell Cell)
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
                    return (Inv == 0) ? (pin.State == SignalState.H) : !(pin.State == SignalState.H);
                else
                    return cell.GetState(Inv);
            }
        }

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
        public Pin I11;
        public Pin I12;
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
        public Pin IO9;
        public Pin IO10;
        #endregion Input/Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public GAL22V10(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public GAL22V10(string Name, Net NetI1, Net NetI2, Net NetI3, Net NetI4, Net NetI5, Net NetI6, Net NetI7, Net NetI8, Net NetI9, Net NetI10, Net NetI11, Net NetI12) : base(Name)
        {
            this.fileName = "";
            this.Power[0] = new Pin(this, "VCC", "24");
            this.Ground[0] = new Pin(this, "GND", "12");

            this.I1  = new Pin(this,  "I1",  "1", LineMode.In, SignalState.L, NetI1);
            this.I2  = new Pin(this,  "I2",  "2", LineMode.In, SignalState.L, NetI2);
            this.I3  = new Pin(this,  "I3",  "3", LineMode.In, SignalState.L, NetI3);
            this.I4  = new Pin(this,  "I4",  "4", LineMode.In, SignalState.L, NetI4);
            this.I5  = new Pin(this,  "I5",  "5", LineMode.In, SignalState.L, NetI5);
            this.I6  = new Pin(this,  "I6",  "6", LineMode.In, SignalState.L, NetI6);
            this.I7  = new Pin(this,  "I7",  "7", LineMode.In, SignalState.L, NetI7);
            this.I8  = new Pin(this,  "I8",  "8", LineMode.In, SignalState.L, NetI8);
            this.I9  = new Pin(this,  "I9",  "9", LineMode.In, SignalState.L, NetI9);
            this.I10 = new Pin(this, "I10", "10", LineMode.In, SignalState.L, NetI10);
            this.I11 = new Pin(this, "I11", "11", LineMode.In, SignalState.L, NetI11);
            this.I12 = new Pin(this, "I12", "13", LineMode.In, SignalState.L, NetI12);

            this.IO1 = new Pin(this, "IO1", "23", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO2 = new Pin(this, "IO2", "22", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO3 = new Pin(this, "IO3", "21", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO4 = new Pin(this, "IO4", "20", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO5 = new Pin(this, "IO5", "19", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO6 = new Pin(this, "IO6", "18", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO7 = new Pin(this, "IO7", "17", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO8 = new Pin(this, "IO8", "16", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO9 = new Pin(this, "IO9", "15", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.IO10 = new Pin(this, "IO10", "14", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[1][];
            SetPinArray(Inputs, 0, new Pin[] { this.I1, this.I2, this.I3, this.I4, this.I5, this.I6, this.I7, this.I8, this.I9, this.I10, this.I11, this.I12 });

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, new Pin[] { this.IO1, this.IO2, this.IO3, this.IO4, this.IO5, this.IO6, this.IO7, this.IO8, this.IO9, this.IO10 });


            pins = new Pin[] { this.I1, this.I2, this.I3, this.I4, this.I5, this.I6, this.I7, this.I8, this.I9, this.I10, this.I11, this.I12, this.IO10, this.IO9, this.IO8, this.IO7, this.IO6, this.IO5, this.IO4, this.IO3, this.IO2, this.IO1 };

            cells = new Cell[NO_OF_CELLS];
            for (int i = 0; i < NO_OF_CELLS; i++)
                cells[i] = new Cell(this, i, AND_ROWS_PER_TERM[i], pins[NO_OF_PINS - 1 - i]);

            connectors = new MatrixConnector[NO_OF_IOS];
            for (int i = 0; i < NO_OF_IOS; i++)
            {
                Cell cell = null;
                int cellIdx = NO_OF_PINS - 1 - PIN_IDX[i];
                if (cellIdx < NO_OF_CELLS)
                    cell = cells[cellIdx];
                connectors[i] = new MatrixConnector(this, i, pins[PIN_IDX[i]], cell);
            }

            and_res_fuses = new byte[NO_OF_IOS][];
            and_pre_fuses = new byte[NO_OF_IOS][];
            for (int i = 0; i < NO_OF_IOS; i++)
            {
                and_res_fuses[i] = new byte[2];
                and_pre_fuses[i] = new byte[2];
                for (int j = 0; j < 2; j++)
                {
                    and_res_fuses[i][j] = 0;
                    and_pre_fuses[i][j] = 0;
                }
            }

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
            sw.WriteLine("Reset ");
            for (int j = 0; j < 1; j++)
            {
                sw.Write(idx.ToString() + ",,");
                for (int k = 0; k < AND_COLS; k++)
                    sw.Write(fuses[idx++].ToString() + ",");
                sw.WriteLine();
            }
            sw.WriteLine();

            for (int i = 0; i < NO_OF_CELLS; i++)
            {
                sw.WriteLine("Block " + i.ToString());
                for (int j = 0; j < AND_ROWS_PER_TERM[i] + 1; j++)
                {
                    sw.Write(idx.ToString() + ",,");
                    for (int k = 0; k < AND_COLS; k++)
                        sw.Write(fuses[idx++].ToString() + ",");
                    sw.WriteLine();
                }
                sw.WriteLine();
            }

            sw.WriteLine("Preset ");
            for (int j = 0; j < 1; j++)
            {
                sw.Write(idx.ToString() + ",,");
                for (int k = 0; k < AND_COLS; k++)
                    sw.Write(fuses[idx++].ToString() + ",");
                sw.WriteLine();
            }
            sw.WriteLine();

            for (int i = 0; i < NO_OF_CELLS; i++)
            {
                sw.WriteLine("S_Bits " + i.ToString());
                sw.Write(idx.ToString() + ",,");
                for (int k = 0; k < 2; k++)
                    sw.Write(fuses[idx++].ToString() + ",");
                sw.WriteLine();
            }

            sw.Write(idx.ToString());

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
                return pins[IDX_CLK].State == SignalState.H;
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
                    if (line.ToLower().StartsWith("g22v10") == false)
                        throw new Exception("Jedec file does not seem to be for Gal 22V10 !\nDevice: " + line);
                }
            }
            sr.Close();

#if LOG_FUSES
            try { LogFuses(fuses, Application.StartupPath + "\\" + Path.ChangeExtension(Path.GetFileName(FileName), "Fuses.csv")); }
            catch { }
#endif

            int idx = 0;
            for (int k = 0; k < NO_OF_IOS; k++)
                for (int l = 0; l < 2; l++)
                    and_res_fuses[k][l] = fuses[idx++];

            for (int i = 0; i < NO_OF_CELLS; i++)
            {
                for (int k = 0; k < NO_OF_IOS; k++)
                    for (int l = 0; l < 2; l++)
                        cells[i].oe_fuses[k][l] = fuses[idx++];

                for (int j = 0; j < AND_ROWS_PER_TERM[i]; j++)
                {
                    for (int k = 0; k < NO_OF_IOS; k++)
                        for (int l = 0; l < 2; l++)
                            cells[i].and_fuses[j][k][l] = fuses[idx++];
                }
            }

            for (int k = 0; k < NO_OF_IOS; k++)
                for (int l = 0; l < 2; l++)
                    and_pre_fuses[k][l] = fuses[idx++];

            for (int i = 0; i < NO_OF_CELLS; i++)
            {
                cells[i].xor = fuses[idx++];
                cells[i].reg = fuses[idx++];
            }

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

            res = ProcessAndRow(and_res_fuses);
            pre = ProcessAndRow(and_pre_fuses);

            for (int i = 0; i < NO_OF_CELLS; i++)
                cells[i].SimulateStep1();

            for (int i = 0; i < NO_OF_CELLS; i++)
                cells[i].SimulateStep2();

            lastCLK = CLK;
        }
        #endregion Public Methods

    }
}