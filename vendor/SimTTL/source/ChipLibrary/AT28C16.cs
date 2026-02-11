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
    /// Class definition of the Flash chip AT28C16.
    /// </summary>
    public class AT28C16 : BaseElement, ILoadable
    {
        // Datasheet: http://cva.stanford.edu/classes/cs99s/datasheets/at28c16.pdf

        private const double ACCESS_TIME = 150; // in ns

        #region Private Fields
        private ushort[] Mem;
        private string fileName;
        private Pin[] addrBus;
        private Pin[] dataBus;
        #endregion Private Fields

        #region Ctrl Pins
        public Pin WEn;
        public Pin CEn;
        public Pin OEn;
        #endregion Ctrl Pins

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
        public AT28C16(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public AT28C16(string Name, Net NetWEn, Net NetCEn, Net NetOEn, Net NetA0, Net NetA1, Net NetA2, Net NetA3, Net NetA4, Net NetA5, Net NetA6, Net NetA7, Net NetA8, Net NetA9, Net NetA10) : base(Name)
        {
            this.fileName = "";
            this.Mem = new ushort[2048];
            for (int i = 0; i < this.Mem.Length; i++)
                Mem[i] = (ushort)(1 << (i & 0xF));

            this.Power[0] = new Pin(this, "VCC", "24");
            this.Ground[0] = new Pin(this, "GND", "12");

            this.WEn = new Pin(this, "WEn", "21", LineMode.In, SignalState.L, NetWEn);
            this.CEn = new Pin(this, "CEn", "18", LineMode.In, SignalState.L, NetCEn);
            this.OEn = new Pin(this, "OEn", "20", LineMode.In, SignalState.L, NetOEn);
                                                                            
            this.A0  = new Pin(this,  "A0",  "8", LineMode.In, SignalState.L, NetA0);
            this.A1  = new Pin(this,  "A1",  "7", LineMode.In, SignalState.L, NetA1);
            this.A2  = new Pin(this,  "A2",  "6", LineMode.In, SignalState.L, NetA2);
            this.A3  = new Pin(this,  "A3",  "5", LineMode.In, SignalState.L, NetA3);
            this.A4  = new Pin(this,  "A4",  "4", LineMode.In, SignalState.L, NetA4);
            this.A5  = new Pin(this,  "A5",  "3", LineMode.In, SignalState.L, NetA5);
            this.A6  = new Pin(this,  "A6",  "2", LineMode.In, SignalState.L, NetA6);
            this.A7  = new Pin(this,  "A7",  "1", LineMode.In, SignalState.L, NetA7);
            this.A8  = new Pin(this,  "A8", "23", LineMode.In, SignalState.L, NetA8);
            this.A9  = new Pin(this,  "A9", "22", LineMode.In, SignalState.L, NetA9);
            this.A10 = new Pin(this, "A10", "19", LineMode.In, SignalState.L, NetA10);


            this.IO0 = new Pin(this, "D0",  "9", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO1 = new Pin(this, "D1", "10", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO2 = new Pin(this, "D2", "11", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO3 = new Pin(this, "D3", "13", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO4 = new Pin(this, "D4", "14", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO5 = new Pin(this, "D5", "15", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO6 = new Pin(this, "D6", "16", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
            this.IO7 = new Pin(this, "D7", "17", LineMode.BiDir, SignalState.Z, ACCESS_TIME);
           

            Inputs = new Pin[4][];
            SetPinArray(Inputs, 0, this.WEn);
            SetPinArray(Inputs, 1, this.CEn);
            SetPinArray(Inputs, 2, this.OEn);
            addrBus = new Pin[] { this.A0, this.A1, this.A2, this.A3, this.A4, this.A5, this.A6, this.A7, this.A8, this.A9, this.A10 };
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
            else SetNewOutputStates(0, SignalState.Z);
        }
        #endregion Public Methods



    }
}
