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

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the Flash chip SST39SF040.
    /// </summary>
    public class SST39SF040 : BaseElement, ILoadable
    {
        // Datasheet: https://ww1.microchip.com/downloads/aemDocuments/documents/MPD/ProductDocuments/DataSheets/SST39SF010A-SST39SF020A-SST39SF040-Data-Sheet-DS20005022.pdf

        private const double ACCESS_TIME = 70; // in ns

        #region Private Fields
        private ushort[] Mem;
        private string fileName;
        private Pin[] addrBus;
        private Pin[] dataBus;
        private bool lastSelected;
        #endregion Private Fields

        #region Control Pins
        public Pin WEn;
        public Pin CEn;
        public Pin OEn;
        #endregion Control Pins

        #region Address Pins
        public Pin A0;
        public Pin A1;
        public Pin A2;
        public Pin A3;
        public Pin A4;
        public Pin A5;
        public Pin A6;
        public Pin A7;
        public Pin A8;
        public Pin A9;
        public Pin A10;
        public Pin A11;
        public Pin A12;
        public Pin A13;
        public Pin A14;
        public Pin A15;
        public Pin A16;
        public Pin A17;
        public Pin A18;
        #endregion Address Pins

        #region Data Pins
        public Pin IO0;
        public Pin IO1;
        public Pin IO2;
        public Pin IO3;
        public Pin IO4;
        public Pin IO5;
        public Pin IO6;
        public Pin IO7;
        #endregion Data Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public SST39SF040(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public SST39SF040(string Name, Net NetWEn, Net NetCEn, Net NetOEn, Net NetA0, Net NetA1, Net NetA2, Net NetA3, Net NetA4, Net NetA5, Net NetA6, Net NetA7, Net NetA8, Net NetA9, Net NetA10, Net NetA11, Net NetA12, Net NetA13, Net NetA14, Net NetA15, Net NetA16, Net NetA17, Net NetA18) : base(Name)
        {
            this.fileName = "";
            this.Mem = new ushort[1 << 19];
            for (int i = 0; i < this.Mem.Length; i++)
                Mem[i] = (ushort)(1 << (i & 0xF));

            this.Power[0] =  new Pin(this, "VDD", "32");
            this.Ground[0] = new Pin(this, "VSS", "16");

            this.WEn = new Pin(this, "WEn", "31", LineMode.In, SignalState.L, NetWEn);
            this.CEn = new Pin(this, "CEn", "22", LineMode.In, SignalState.L, NetCEn);
            this.OEn = new Pin(this, "OEn", "24", LineMode.In, SignalState.L, NetOEn);
                                                                        
            this.A0 = new Pin(this,   "A0", "12", LineMode.In, SignalState.L, NetA0);
            this.A1 = new Pin(this,   "A1", "11", LineMode.In, SignalState.L, NetA1);
            this.A2 = new Pin(this,   "A2", "10", LineMode.In, SignalState.L, NetA2);
            this.A3 = new Pin(this,   "A3",  "9", LineMode.In, SignalState.L, NetA3);
            this.A4 = new Pin(this,   "A4",  "8", LineMode.In, SignalState.L, NetA4);
            this.A5 = new Pin(this,   "A5",  "7", LineMode.In, SignalState.L, NetA5);
            this.A6 = new Pin(this,   "A6",  "6", LineMode.In, SignalState.L, NetA6);
            this.A7 = new Pin(this,   "A7",  "5", LineMode.In, SignalState.L, NetA7);
            this.A8 = new Pin(this,   "A8", "27", LineMode.In, SignalState.L, NetA8);
            this.A9 = new Pin(this,   "A9", "26", LineMode.In, SignalState.L, NetA9);
            this.A10 = new Pin(this, "A10", "23", LineMode.In, SignalState.L, NetA10);
            this.A11 = new Pin(this, "A11", "25", LineMode.In, SignalState.L, NetA11);
            this.A12 = new Pin(this, "A12",  "4", LineMode.In, SignalState.L, NetA12);
            this.A13 = new Pin(this, "A13", "28", LineMode.In, SignalState.L, NetA13);
            this.A14 = new Pin(this, "A14", "29", LineMode.In, SignalState.L, NetA14);
            this.A15 = new Pin(this, "A15",  "3", LineMode.In, SignalState.L, NetA15);
            this.A16 = new Pin(this, "A16",  "2", LineMode.In, SignalState.L, NetA16);
            this.A17 = new Pin(this, "A17", "30", LineMode.In, SignalState.L, NetA17);
            this.A17 = new Pin(this, "A18",  "1", LineMode.In, SignalState.L, NetA18);

            this.IO0 = new Pin(this, "D0", "13", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO1 = new Pin(this, "D1", "14", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO2 = new Pin(this, "D2", "15", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO3 = new Pin(this, "D3", "17", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO4 = new Pin(this, "D4", "18", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO5 = new Pin(this, "D5", "19", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO6 = new Pin(this, "D6", "20", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO7 = new Pin(this, "D7", "21", LineMode.BiDir, SignalState.Z, ACCESS_TIME);


            Inputs = new Pin[4][];
            SetPinArray(Inputs, 0, this.WEn);
            SetPinArray(Inputs, 1, this.CEn);
            SetPinArray(Inputs, 2, this.OEn);
            addrBus = new Pin[] { this.A0, this.A1, this.A2, this.A3, this.A4, this.A5, this.A6, this.A7, this.A8, this.A9, this.A10, this.A11, this.A12, this.A13, this.A14, this.A15, this.A16 };
            Inputs[3] = addrBus;

            Outputs = new Pin[1][];
            dataBus = new Pin[] { this.IO0, this.IO1, this.IO2, this.IO3, this.IO4, this.IO5, this.IO6, this.IO7 };
            Outputs[0] = dataBus;

            SimulationRestart();
        }
        #endregion Constructors

        #region Public Methods
        /// <summary>
        /// Load the contents of a binary file into the element.
        /// </summary>
        /// <param name="FileName">Full file name of the file to be loaded.</param>
        public void LoadContents(string FileName)
        {
            fileName = FileName;
            byte[] buffer = File.ReadAllBytes(FileName);
            for (int i = 0; i < Math.Min(Mem.Length, buffer.Length); i++)
                Mem[i] = buffer[i];
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
            if ((CEn.State == SignalState.L) && (OEn.State == SignalState.L))
            {
                lastSelected = true;
                int addr = 0;
                for (int i = 0; i < Inputs[3].Length; i++)
                {
                    if (Inputs[3][i].State == SignalState.L)
                    { }
                    else if (Inputs[3][i].State == SignalState.H)
                    {
                        addr |= 1 << i;
                    }
                    else
                    {
                        SetOutputStates(SignalState.U);
                        return;
                    }
                }
                int data = Mem[addr];
                for (int i = 0; i < Outputs[0].Length; i++)
                {
                    if ((data & 1) == 0)
                        Outputs[0][i].NewOutState = SignalState.L;
                    else
                        Outputs[0][i].NewOutState = SignalState.H;

                    data >>= 1;
                }
            }
            else if (lastSelected)
            {
                SetNewOutputStates(0, SignalState.Z);
                lastSelected = false;
            }
        }
        #endregion Public Methods

    }
}
