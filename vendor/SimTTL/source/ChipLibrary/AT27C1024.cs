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
    /// Class definition of the Flash chip AT27C1024.
    /// </summary>
    public class AT27C1024 : BaseElement, ILoadable
    {
        // Datashet: https://www.microchip.com/en-us/product/AT27C1024#Documentation

        private const double ACCESS_TIME = 70; // in ns

        #region Private Fields
        private ushort[] Mem;
        private string fileName;
        private Pin[] addrBus;
        private Pin[] dataBus;
        #endregion Private Fields

        #region Control Pins
        public Pin PGMn;
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
        #endregion Address Pins

        #region Data Pins
        public Pin DQ0;
        public Pin DQ1;
        public Pin DQ2;
        public Pin DQ3;
        public Pin DQ4;
        public Pin DQ5;
        public Pin DQ6;
        public Pin DQ7;
        public Pin DQ8;
        public Pin DQ9;
        public Pin DQ10;
        public Pin DQ11;
        public Pin DQ12;
        public Pin DQ13;
        public Pin DQ14;
        public Pin DQ15;
        #endregion Data Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public AT27C1024(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public AT27C1024(string Name, Net NetPGMn, Net NetCEn, Net NetOEn, Net NetA0, Net NetA1, Net NetA2, Net NetA3, Net NetA4, Net NetA5, Net NetA6, Net NetA7, Net NetA8, Net NetA9, Net NetA10, Net NetA11, Net NetA12, Net NetA13, Net NetA14, Net NetA15) : base(Name)
        {
            this.fileName = "";
            this.Mem = new ushort[65536];
            for (int i = 0; i < this.Mem.Length; i++)
                Mem[i] = (ushort)(1 << (i & 0xF));

            this.Power[0] = new Pin(this, "VCC", "40");
            this.Ground = new Pin[2];
            this.Ground[0] = new Pin(this, "GND", "11");
            this.Ground[1] = new Pin(this, "GND", "30");

            this.PGMn = new Pin(this, "PGMn", "39", LineMode.In, SignalState.L, NetPGMn);
            this.CEn = new Pin(this, "CEn",  "2", LineMode.In, SignalState.L, NetCEn);
            this.OEn = new Pin(this, "OEn", "20", LineMode.In, SignalState.L, NetOEn);
                                                                            
            this.A0 =  new Pin(this,  "A0", "21", LineMode.In, SignalState.L, NetA0);
            this.A1 =  new Pin(this,  "A1", "22", LineMode.In, SignalState.L, NetA1);
            this.A2 =  new Pin(this,  "A2", "23", LineMode.In, SignalState.L, NetA2);
            this.A3 =  new Pin(this,  "A3", "24", LineMode.In, SignalState.L, NetA3);
            this.A4 =  new Pin(this,  "A4", "25", LineMode.In, SignalState.L, NetA4);
            this.A5 =  new Pin(this,  "A5", "26", LineMode.In, SignalState.L, NetA5);
            this.A6 =  new Pin(this,  "A6", "27", LineMode.In, SignalState.L, NetA6);
            this.A7 =  new Pin(this,  "A7", "28", LineMode.In, SignalState.L, NetA7);
            this.A8 =  new Pin(this,  "A8", "29", LineMode.In, SignalState.L, NetA8);
            this.A9 =  new Pin(this,  "A9", "31", LineMode.In, SignalState.L, NetA9);
            this.A10 = new Pin(this, "A10", "32", LineMode.In, SignalState.L, NetA10);
            this.A11 = new Pin(this, "A11", "33", LineMode.In, SignalState.L, NetA11);
            this.A12 = new Pin(this, "A12", "34", LineMode.In, SignalState.L, NetA12);
            this.A13 = new Pin(this, "A13", "35", LineMode.In, SignalState.L, NetA13);
            this.A14 = new Pin(this, "A14", "36", LineMode.In, SignalState.L, NetA14);
            this.A15 = new Pin(this, "A15", "37", LineMode.In, SignalState.L, NetA15);

            this.DQ0  = new Pin(this,  "D0", "19", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ1  = new Pin(this,  "D1", "18", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ2  = new Pin(this,  "D2", "17", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ3  = new Pin(this,  "D3", "16", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ4  = new Pin(this,  "D4", "15", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ5  = new Pin(this,  "D5", "14", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ6  = new Pin(this,  "D6", "13", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ7  = new Pin(this,  "D7", "12", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ8  = new Pin(this,  "D8", "10", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ9  = new Pin(this,  "D9",  "9", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ10 = new Pin(this, "D10",  "8", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ11 = new Pin(this, "D11",  "7", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ12 = new Pin(this, "D12",  "6", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ13 = new Pin(this, "D13",  "5", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ14 = new Pin(this, "D14",  "4", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.DQ15 = new Pin(this, "D15",  "3", LineMode.BiDir, SignalState.Z, ACCESS_TIME);

            Inputs = new Pin[4][];
            SetPinArray(Inputs, 0, this.PGMn);
            SetPinArray(Inputs, 1, this.CEn);
            SetPinArray(Inputs, 2, this.OEn);
            addrBus = new Pin[] { this.A0, this.A1, this.A2, this.A3, this.A4, this.A5, this.A6, this.A7, this.A8, this.A9, this.A10, this.A11, this.A12, this.A13, this.A14, this.A15 };
            Inputs[3] = addrBus;

            Outputs = new Pin[1][];
            dataBus = new Pin[] { this.DQ0, this.DQ1, this.DQ2, this.DQ3, this.DQ4, this.DQ5, this.DQ6, this.DQ7, this.DQ8, this.DQ9, this.DQ10, this.DQ11, this.DQ12, this.DQ13, this.DQ14, this.DQ15 };
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
                Mem[i] = BitConverter.ToUInt16(buffer, 2 * i);
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
                int addr = 0;
                for (int i = 0; i < addrBus.Length; i++)
                {
                    if (addrBus[i].State == SignalState.L)
                    { }
                    else if (addrBus[i].State == SignalState.H)
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
                for (int i = 0; i < dataBus.Length; i++)
                {
                    if ((data & 1) == 0)
                        dataBus[i].NewOutState = SignalState.L;
                    else
                        dataBus[i].NewOutState = SignalState.H;

                    data >>= 1;
                }
            }
            else SetNewOutputStates(0, SignalState.Z);
        }
        #endregion Public Methods

    }
}
